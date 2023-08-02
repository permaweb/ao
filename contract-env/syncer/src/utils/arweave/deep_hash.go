package arweave

import (
	"crypto/sha512"
	"fmt"
)

func DeepHash(data []any) [48]byte {
	tag := append([]byte("list"), []byte(fmt.Sprintf("%d", len(data)))...)
	tagHash := sha512.Sum384(tag)
	return deepHashAcc(data, tagHash)
}

func deepHashBytes(x []byte) [48]byte {
	tag := append([]byte("blob"), []byte(fmt.Sprintf("%d", len(x)))...)
	tagHash := sha512.Sum384(tag)
	blobHash := sha512.Sum384(x)
	tagged := append(tagHash[:], blobHash[:]...)
	return sha512.Sum384(tagged)
}

func convertToSliceOfAny[T string | []byte | Base64String](in []T) (out []any) {
	out = make([]any, len(in))
	for i, v := range in {
		out[i] = []byte(v)
	}
	return
}

func deepHashAcc(data []interface{}, acc [48]byte) [48]byte {
	if len(data) < 1 {
		return acc
	}

	dHash := [48]byte{}
	d := data[0]

	switch x := d.(type) {
	case []byte:
		dHash = deepHashBytes(x)
	case string:
		dHash = deepHashBytes([]byte(x))
	case BigInt:
		dHash = deepHashBytes([]byte(x.String()))
	case Base64String:
		dHash = deepHashBytes([]byte(x))
	case RewardAddr:
		dHash = deepHashBytes([]byte(x))
	case []Base64String:
		dHash = DeepHash(convertToSliceOfAny(x))
	case []string:
		dHash = DeepHash(convertToSliceOfAny(x))
	case [][]byte:
		dHash = DeepHash(convertToSliceOfAny(x))
	case []interface{}:
		dHash = DeepHash(x)
	default:
		panic("unsupported deep hash type")
	}

	hashPair := append(acc[:], dHash[:]...)
	newAcc := sha512.Sum384(hashPair)
	return deepHashAcc(data[1:], newAcc)
}
