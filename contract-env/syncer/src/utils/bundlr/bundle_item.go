package bundlr

import (
	"bytes"
	"crypto/sha256"
	"encoding/binary"
	"encoding/json"
	"io"

	"github.com/warp-contracts/syncer/src/utils/arweave"
	"github.com/warp-contracts/syncer/src/utils/tool"
)

type BundleItem struct {
	SignatureType SignatureType        `json:"signature_type"`
	Signature     arweave.Base64String `json:"signature"`
	Owner         arweave.Base64String `json:"owner"`  //  utils.Base64Encode(pubkey)
	Target        arweave.Base64String `json:"target"` // optional, if exist must length 32, and is base64 str
	Anchor        arweave.Base64String `json:"anchor"` // optional, if exist must length 32, and is base64 str
	Tags          Tags                 `json:"tags"`
	Data          arweave.Base64String `json:"data"`
	Id            arweave.Base64String `json:"id"`

	// Not in the standard, used internally
	tagsBytes []byte `json:"-"`
}

func (self *BundleItem) ensureTagsSerialized() (err error) {
	if len(self.tagsBytes) != 0 || len(self.Tags) == 0 {
		return nil
	}
	self.tagsBytes, err = self.Tags.Marshal()
	if err != nil {
		return err
	}
	return nil
}

func (self *BundleItem) NestBundles(dataItems []*BundleItem) (err error) {
	// Serialize bundles first to get the sizes
	var bundleSizes int
	binaries := make([][]byte, len(dataItems))
	for i, item := range dataItems {
		binaries[i], err = item.Marshal()
		if err != nil {
			return err
		}

		bundleSizes += len(binaries[i])
	}

	var out bytes.Buffer
	n, err := out.Write(LongTo32ByteArray(len(dataItems)))
	if err != nil {
		return err
	}
	if n != 32 {
		return ErrNestedBundleInvalidLength
	}

	// Headers
	for i, item := range dataItems {
		n, err = out.Write(LongTo32ByteArray(len(binaries[i])))
		if err != nil {
			return err
		}
		if n != 32 {
			return ErrNestedBundleInvalidLength
		}

		n, err = out.Write(item.Id)
		if err != nil {
			return err
		}
		if n != 32 {
			return ErrNestedBundleInvalidLength
		}
	}

	// Binaries
	for _, binary := range binaries {
		_, err = out.Write(binary)
		if err != nil {
			return err
		}
	}

	self.Data = arweave.Base64String(out.Bytes())

	return
}

func (self *BundleItem) Size() (out int) {
	signer, err := GetSigner(self.SignatureType, nil)
	if err != nil {
		return
	}

	out = 2 /*signature type */ + signer.GetSignatureLength() + signer.GetOwnerLength() + 1 /*target flag*/ + 1 /*anchor flag*/ + len(self.Data) + 8 /*len tags*/ + 8 /*len tags bytes*/
	if len(self.Target) > 0 {
		out += len(self.Target)
	}
	if len(self.Anchor) > 0 {
		out += len(self.Anchor)
	}

	err = self.ensureTagsSerialized()
	if err != nil {
		return -1
	}

	out += len(self.tagsBytes)

	return
}

func (self *BundleItem) String() string {
	buf, err := json.MarshalIndent(self, "", "  ")
	if err != nil {
		return ""
	}
	return string(buf)
}

func (self BundleItem) MarshalTo(buf []byte) (n int, err error) {
	if len(buf) < self.Size() {
		return 0, ErrBufferTooSmall
	}

	// NOTE: Normally bytes.Buffer takes ownership of the buf but in this case when we know it's big enough we ensure it won't get reallocated
	writer := tool.NewBuffer(buf)
	err = self.Encode(writer)
	if err != nil {
		return
	}

	return self.Size(), nil
}

func (self BundleItem) Marshal() ([]byte, error) {
	buffer := make([]byte, self.Size())
	_, err := self.MarshalTo(buffer)
	return buffer, err
}

func (self BundleItem) MarshalJSON() ([]byte, error) {
	type BundleItemAlias BundleItem
	return json.Marshal(&struct {
		*BundleItemAlias
	}{BundleItemAlias: (*BundleItemAlias)(&self)})
}

func (self *BundleItem) UnmarshalJSON(data []byte) error {
	type BundleItemAlias BundleItem
	aux := &struct {
		*BundleItemAlias
	}{BundleItemAlias: (*BundleItemAlias)(self)}

	return json.Unmarshal(data, aux)
}

func (self *BundleItem) sign(signer Signer) (id, signature []byte, err error) {
	// Tags
	err = self.ensureTagsSerialized()
	if err != nil {
		return
	}

	values := []any{
		"dataitem",
		"1",
		self.SignatureType.Bytes(),
		self.Owner,
		self.Target,
		self.Anchor,
		self.tagsBytes,
		self.Data,
	}

	deepHash := arweave.DeepHash(values)

	// Compute the signature
	signature, err = signer.Sign(deepHash[:])
	if err != nil {
		return
	}

	// Bundle item id
	idArray := sha256.Sum256(signature)
	id = idArray[:]

	return
}

func (self *BundleItem) Reader() (out *bytes.Buffer, err error) {
	// Don't try to allocate more than 4kB. Buffer will grow if needed anyway.
	initSize := tool.Max(4096, self.Size())
	out = bytes.NewBuffer(make([]byte, 0, initSize))

	err = self.Encode(out)
	return
}

func (self *BundleItem) Sign(signer Signer) (err error) {
	if signer == nil {
		err = ErrSignerNotSpecified
		return
	}
	if len(self.Owner) != 0 || len(self.Signature) != 0 || len(self.Id) != 0 {
		// Already signed
		return
	}
	self.SignatureType = signer.GetType()
	self.Owner = signer.GetOwner()

	// Signs bundle item
	self.Id, self.Signature, err = self.sign(signer)
	return
}

func (self *BundleItem) IsSigned() bool {
	return len(self.Signature) != 0 && len(self.Id) != 0 && len(self.Owner) != 0
}

func (self *BundleItem) Encode(out io.Writer) (err error) {
	if !self.IsSigned() {
		err = ErrNotSigned
		return
	}

	// Serialization
	_, err = out.Write(ShortTo2ByteArray(int(self.SignatureType)))
	if err != nil {
		return
	}
	_, err = out.Write(self.Signature)
	if err != nil {
		return
	}
	_, err = out.Write(self.Owner)
	if err != nil {
		return
	}

	// Optional target
	if len(self.Target) == 0 {
		_, err = out.Write([]byte{0})
		if err != nil {
			return
		}
	} else {
		_, err = out.Write([]byte{1})
		if err != nil {
			return
		}
		_, err = out.Write(self.Target)
		if err != nil {
			return
		}
	}

	// Optional anchor
	if len(self.Anchor) == 0 {
		_, err = out.Write([]byte{0})
		if err != nil {
			return
		}
	} else {
		_, err = out.Write([]byte{1})
		if err != nil {
			return
		}
		_, err = out.Write(self.Anchor)
		if err != nil {
			return
		}
	}

	// Rest
	_, err = out.Write(LongTo8ByteArray(len(self.Tags)))
	if err != nil {
		return
	}
	_, err = out.Write(LongTo8ByteArray(len(self.tagsBytes)))
	if err != nil {
		return
	}
	_, err = out.Write(self.tagsBytes)
	if err != nil {
		return
	}
	_, err = out.Write(self.Data)
	if err != nil {
		return
	}

	return
}

func (self *BundleItem) Unmarshal(buf []byte) (err error) {
	reader := bytes.NewReader(buf)
	return self.UnmarshalFromReader(reader)
}

// Reverse operation of Reader
func (self *BundleItem) UnmarshalFromReader(reader io.Reader) (err error) {
	// Signature type
	signatureType := make([]byte, 2)
	n, err := reader.Read(signatureType)
	if err != nil {
		return
	}
	if n < 2 {
		err = ErrNotEnoughBytesForSignatureType
		return
	}
	self.SignatureType = SignatureType(binary.LittleEndian.Uint16(signatureType))

	// Signer, used only getting config
	signer, err := GetSigner(self.SignatureType, nil)
	if err != nil {
		return
	}

	// Signature (different length depending on the signature type)
	self.Signature = make([]byte, signer.GetSignatureLength())
	n, err = reader.Read(self.Signature)
	if err != nil {
		return
	}
	if n < signer.GetSignatureLength() {
		err = ErrNotEnoughBytesForSignature
		return
	}

	// Owner - public key (different length depending on the signature type)
	self.Owner = make([]byte, signer.GetOwnerLength())
	n, err = reader.Read(self.Owner)
	if err != nil {
		return
	}
	if n < signer.GetOwnerLength() {
		err = ErrNotEnoughBytesForOwner
		return
	}

	// Target (it's optional)
	isTargetPresent := make([]byte, 1)
	n, err = reader.Read(isTargetPresent)
	if err != nil {
		return err
	}
	if n < 1 {
		err = ErrNotEnoughBytesForTargetFlag
		return
	}

	if isTargetPresent[0] == 0 {
		self.Target = []byte{}
	} else {
		// Value present
		self.Target = make([]byte, 32)
		n, err = reader.Read(self.Target)
		if err != nil {
			return err
		}
		if n < 32 {
			err = ErrNotEnoughBytesForTarget
			return
		}
	}

	// Anchor (it's optional)
	isAnchorPresent := make([]byte, 1)
	n, err = reader.Read(isAnchorPresent)
	if err != nil {
		return err
	}
	if n < 1 {
		err = ErrNotEnoughBytesForAnchorFlag
		return
	}

	if isAnchorPresent[0] == 0 {
		self.Anchor = []byte{}
	} else {
		// Value present
		self.Anchor = make([]byte, 32)
		n, err = reader.Read(self.Anchor)
		if err != nil {
			return err
		}
		if n < 32 {
			err = ErrNotEnoughBytesForAnchor
			return
		}
	}

	// Length of the tags slice
	numTagsBuffer := make([]byte, 8)
	n, err = reader.Read(numTagsBuffer)
	if err != nil {
		return
	}
	if n < 8 {
		err = ErrNotEnoughBytesForNumberOfTags
		return
	}
	numTags := int(binary.LittleEndian.Uint64(numTagsBuffer))

	// Size of encoded tags
	numTagsBytesBuffer := make([]byte, 8)
	n, err = reader.Read(numTagsBytesBuffer)
	if err != nil {
		return
	}
	if n < 8 {
		err = ErrNotEnoughBytesForNumberOfTagBytes
		return
	}
	numTagsBytes := int(binary.LittleEndian.Uint64(numTagsBytesBuffer))

	// Tags
	self.Tags = make([]Tag, numTags)
	if numTags > 0 {
		// Read tags
		self.tagsBytes = make([]byte, numTagsBytes)
		n, err = reader.Read(self.tagsBytes)
		if err != nil {
			return
		}
		if n < numTagsBytes {
			err = ErrNotEnoughBytesForTags
			return
		}

		// Parse tags
		err = self.Tags.Unmarshal(self.tagsBytes)
		if err != nil {
			return
		}
	}

	// The rest is just data
	var data bytes.Buffer
	_, err = data.ReadFrom(reader)
	if err != nil {
		return
	}
	self.Data = data.Bytes()

	// Id is calculated from the signature
	idArray := sha256.Sum256(self.Signature)
	self.Id = idArray[:]
	return
}

// https://github.com/ArweaveTeam/arweave-standards/blob/master/ans/ANS-104.md#21-verifying-a-dataitem
func (self *BundleItem) Verify() (err error) {
	idArray := sha256.Sum256(self.Signature)
	if !bytes.Equal(idArray[:], self.Id) {
		err = ErrVerifyIdSignatureMismatch
		return
	}

	// an anchor isn't more than 32 bytes
	// with this lib it has to be 0 or 32bytes
	if len(self.Anchor) != 0 && len(self.Anchor) != 32 {
		err = ErrVerifyBadAnchorLength
		return
	}

	// Tags
	if len(self.Tags) > 128 {
		err = ErrVerifyTooManyTags
		return
	}

	for _, tag := range self.Tags {
		if len(tag.Name) == 0 {
			err = ErrVerifyEmptyTagName
			return
		}
		if len(tag.Name) > 1024 {
			err = ErrVerifyTooLongTagName
			return
		}
		if len(tag.Value) == 0 {
			err = ErrVerifyEmptyTagValue
			return
		}
		if len(tag.Value) > 3072 {
			err = ErrVerifyTooLongTagValue
			return
		}
	}

	// Bundlr won't accept more tags than 4KB, so check that
	err = self.ensureTagsSerialized()
	if err != nil {
		return
	}
	if len(self.tagsBytes) > 4096 {
		err = ErrVerifyTooManyTagsBytes
		return
	}

	return
}

func (self *BundleItem) VerifySignature() (err error) {
	err = self.ensureTagsSerialized()
	if err != nil {
		return
	}

	values := []any{
		"dataitem",
		"1",
		self.SignatureType.Bytes(),
		self.Owner,
		self.Target,
		self.Anchor,
		self.tagsBytes,
		self.Data,
	}

	deepHash := arweave.DeepHash(values)

	signer, err := GetSigner(self.SignatureType, self.Owner)
	if err != nil {
		return
	}

	return signer.Verify(deepHash[:], self.Signature)
}
