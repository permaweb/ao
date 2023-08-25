package arweave

import (
	"encoding/base64"
	"math/big"

	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"

	"testing"
)

func TestEncoderTestSuite(t *testing.T) {
	suite.Run(t, new(EncoderTestSuite))
}

type EncoderTestSuite struct {
	suite.Suite
}

func (s *EncoderTestSuite) TestTrim() {
	env := NewEncoder()
	a := []byte{0, 0, 0, 3}
	require.Equal(s.T(), []byte{3}, env.Trim(a))
}

func (s *EncoderTestSuite) TestUint64() {
	env := NewEncoder()
	env.RawWrite(uint64(1234))
	require.Equal(s.T(), "BNI", env.Base64())
}

func (s *EncoderTestSuite) TestEncodeInt() {
	env := NewEncoder()
	env.WriteUint64(1234, 2)
	require.Equal(s.T(), "AAIE0g", env.Base64())
}

func (s *EncoderTestSuite) TestEncodeIntZero() {
	env := NewEncoder()
	env.WriteUint64(0, 1)
	require.Equal(s.T(), []byte{1, 0}, env.Bytes())
}

func (s *EncoderTestSuite) TestEncodeTimestamp() {
	env := NewEncoder()
	env.WriteUint64(1678120795, 1)
	// 046406175B
	// 046406175B
	require.Equal(s.T(), []byte{0x04, 0x64, 0x06, 0x17, 0x5B}, env.Bytes())
}

func (s *EncoderTestSuite) TestEncodeBinEmpty() {
	env := NewEncoder()
	env.WriteBuffer([]byte{}, 2)
	require.Equal(s.T(), []byte{0, 0}, env.Bytes())
}

func (s *EncoderTestSuite) TestEncodeBin() {
	env := NewEncoder()
	env.WriteBuffer([]byte{9, 7}, 2)
	require.Equal(s.T(), []byte{0, 2, 9, 7}, env.Bytes())
}

func (s *EncoderTestSuite) TestEncodeBinInt() {
	env := NewEncoder()
	env.WriteBuffer([]byte{9, 7}, 2)
	env.WriteUint64(1678120795, 1)
	require.Equal(s.T(), []byte{0, 2, 9, 7, 0x04, 0x64, 0x06, 0x17, 0x5B}, env.Bytes())
}

func (s *EncoderTestSuite) TestEncodeListFlat() {
	env := NewEncoder()
	l := make([][]byte, 0)
	l = append(l, []byte{9, 7})
	env.WriteSliceByte(l, 1, 2)
	require.Equal(s.T(), []byte{1, 0, 2, 9, 7}, env.Bytes())
}

func (s *EncoderTestSuite) TestEncodeList() {
	env := NewEncoder()
	l := make([][]byte, 0)
	l = append(l, []byte{9, 7})
	l = append(l, []byte{6, 5})
	env.WriteSliceByte(l, 1, 2)
	// fmt.Printf("%X\n", env.Bytes())
	require.Equal(s.T(), []byte{2, 0, 2, 6, 5, 0, 2, 9, 7}, env.Bytes())
}

func (s *EncoderTestSuite) TestEncodeListEmpty() {
	env := NewEncoder()
	l := make([][]byte, 0)
	env.WriteSliceByte(l, 2, 2)
	require.Equal(s.T(), []byte{0, 0}, env.Bytes())
}

func (s *EncoderTestSuite) TestEncodeListEmptyAny() {
	env := NewEncoder()
	l := make([]any, 0)
	env.WriteSliceAny(l, 2, 2)
	require.Equal(s.T(), []byte{0, 0}, env.Bytes())
}

func (s *EncoderTestSuite) TestEncodeBuffer() {
	env := NewEncoder()
	a, _ := base64.RawURLEncoding.DecodeString("ZXktLIUuYEaTrN6l2grYO49JegaOp0sbz_itn6hVKLao47L_kdFkMlJ3VWSI8fLB")
	env.WriteBuffer(a, 1)
	// fmt.Printf("%v\n", env.Bytes())
	require.Equal(s.T(), []byte{48, 101, 121, 45, 44, 133, 46, 96, 70, 147, 172, 222, 165, 218, 10, 216, 59, 143, 73, 122, 6, 142, 167, 75, 27, 207, 248, 173, 159, 168, 85, 40, 182, 168, 227, 178, 255, 145, 209, 100, 50, 82, 119, 85, 100, 136, 241, 242, 193}, env.Bytes())

	// 65 79 2D 2C 85 2E 60 46 93 AC DE A5 DA 0A D8 3B 8F 49 7A 06 8E A7 4B 1B CF F8 AD 9F A8 55 28 B6 A8 E3 B2 FF 91 D1 64 32 52 77 55 64 88 F1 F2 C1
	// 3065792D2C852E604693ACDEA5DA0AD83B8F497A068EA74B1BCFF8AD9FA85528B6A8E3B2FF91D164325277556488F1F2C1
	//   65792D2C852E604693ACDEA5DA0AD83B8F497A068EA74B1BCFF8AD9FA85528B6A8E3B2FF91D164325277556488F1F2C1
}

func (s *EncoderTestSuite) TestIolistToBinary() {
	env := NewEncoder()
	l := make([]Base64String, 0)
	l = append(l, Base64String{1, 2})
	l = append(l, Base64String{3, 4})
	env.RawWriteBase64StringSlice(l)
	require.Equal(s.T(), []byte{1, 2, 3, 4}, env.Bytes())
}

func (s *EncoderTestSuite) TestRawWriteSize() {
	env := NewEncoder()
	l := uint64(1234)
	env.RawWriteSize(l, 8)
	// fmt.Printf("%X\n", env.Bytes())
	// 00000000000004D2
	// 00000000000004D2
	require.Equal(s.T(), []byte{0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x4, 0xd2}, env.Bytes())
}

func (s *EncoderTestSuite) TestRawWriteSizeBigger() {
	env := NewEncoder()
	l := uint64(1234)
	env.RawWriteSize(l, 32)
	// fmt.Printf("%v\n", env.Bytes())
	// 00000000000000000000000000000000000000000000000000000000000004D2
	// 00000000000000000000000000000000000000000000000000000000000004D2
	require.Equal(s.T(), []byte{0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x4, 0xd2}, env.Bytes())
}

func (s *EncoderTestSuite) TestOutput() {
	env := NewEncoder()
	a, _ := base64.RawURLEncoding.DecodeString("7NRtHpg2JEPn37XcRUNa2iRqBAIE5GNIwBbov_OX_9g")
	buf := Base64String(a)
	env.RawWrite(buf.Head(32))
	require.Equal(s.T(), a, env.Bytes())

	// ECD46D1E98362443E7DFB5DC45435ADA246A040204E46348C016E8BFF397FFD8
	// ECD46D1E98362443E7DFB5DC45435ADA246A040204E46348C016E8BFF397FFD8
}
func (s *EncoderTestSuite) TestRawWriteBigInt() {
	env := NewEncoder()
	v := BigInt{*big.NewInt(9), true}
	env.RawWriteSize(v, 3)
	// fmt.Printf("%X\n", env.Bytes())

	require.Equal(s.T(), []byte{0, 0, 9}, env.Bytes())

	// ECD46D1E98362443E7DFB5DC45435ADA246A040204E46348C016E8BFF397FFD8
	// ECD46D1E98362443E7DFB5DC45435ADA246A040204E46348C016E8BFF397FFD8
}

func (s *EncoderTestSuite) TestBigIntUndefined() {
	env := NewEncoder()
	v := BigInt{*big.NewInt(9), false}
	env.Write(v, 4)
	// fmt.Printf("%X\n", env.Bytes())

	require.Equal(s.T(), []byte{0, 0, 0, 0}, env.Bytes())
}
func (s *EncoderTestSuite) TestBigIntBig() {
	env := NewEncoder()
	v := BigInt{*big.NewInt(0), true}
	v.Int.SetString("115792071036953558077439067295872093892934358766013398190786716226139132215951", 10)
	env.Write(v, 2)
	require.Equal(s.T(), []byte{0x0, 0x20, 0xff, 0xff, 0xfd, 0x5c, 0xe9, 0x39, 0x3c, 0x84, 0xa8, 0x39, 0x69, 0xfd, 0x88, 0x8, 0x88, 0xf0, 0xdb, 0xae, 0xdf, 0xc5, 0xb4, 0x3a, 0x5f, 0xfa, 0xe7, 0x66, 0x56, 0x23, 0xbb, 0x9b, 0x42, 0x8f}, env.Bytes())

	// 0020FFFFFD5CE9393C84A83969FD880888F0DBAEDFC5B43A5FFAE7665623BB9B428F
	// 0020FFFFFD5CE9393C84A83969FD880888F0DBAEDFC5B43A5FFAE7665623BB9B428F
}

// This is block 1132410 before hashing
// func (s *EncoderTestSuite) TestPrint() {
// 	buf, _ := base64.RawURLEncoding.DecodeString("MJon-Q2Y2hQTTkgv_Gsb5Xy-DOiUo3ytwUnprNcUv0GWaTQAzMWcWkSOdQgvGRq2yARkBhdbAAG4AxFHegAg___9XOk5PISoOWn9iAiI8Nuu38W0Ol_652ZWI7ubQo8ABw-FrdT5TYMEZAYXWyD___2u4VH2wAobEkk5wy6iDTJitGxECd5EitIrqnFZGQAEBNwAAAAGerDKXKD2IA9SCEnrtAGE8uwpF_WQwa-pN_zBb_LPfTm7ZPrgGnJCIPZreIh7rpiTNAvDoglTScD-jgEjvuzRGO3YjLfBaho4MKPH2V9TZQM96B1qhKhmceBysA2jX9yIL7p1X7RcYhoBcF3ey46dUZa874vroHEHkDDYbRvZZVfgj9s6lm1qjldLkyb_3tJ5_nqKSfEobaCNX0TuWVB8zIv_rcHywbKOPuUHo8pNZj_p_AEABhvWSNig9gEBAQoBAQEKAAAAFCA8a137hRWryqV70h5XMpkREKkKzepbg8HREGwepWIOviAihFfICQefsM6p9jaF43Ieg-IJ7rxx1prCEIaQ6Jm7oCB-IfFtE4uBolnVEWAv2p9_TuOOeCcslpHcMc5HAJAbziDsWnqD3_fFao6JdQVhPj0SRVFo_M8o193fUAaU6PMxECBiL7HHI0Rchd3gpLYwQSV93BbXO2Yg4zMcl27Os_kXUSAzUAbvqzAgvywWsNLGN_3gNr3OrFCHt6DfjunSEik1GiCUmLp_4V4UGo7lzt5fviFiUoKMvSPTBuYd9j-nEv-2dSAulTsmYtnSiG-CLeEkYcgBexgZvMxZc5tqCe9ewbRKAiCKxfguVFk7qFKgReqqrTq7_9prYIeZ0aN2RqvLDSe95yBPK1mvnvBqGtAnEBrM8Y4jQ3T0KOF_eManJoWa9nT5CiB-lsX9q1E2A9g59uoGs0qCG3975FOtnIiJzaIJhUgdxiB9gW8h0KM4Tj0UklumGgukn6eCzkJhF8eHe_nqqOcjXiB55K8lglzZBK1wua6yahvyTrLwDaW8FBq7p0VcPz-SuiBktuvLCau_0NTKvdeEiIrEFMZ680NxuskvMHYb7sPjfSC7Fp9vGRmf9drENgweNlJiJca_xJKBlAz5IzbzRypqIiCw4YrokfKOTXKhfsF5stkvbAXsOeg08j2TJ1L0H9iKWyDBwAXau4BKFx_E5zRVghxYN4s08mq36vH-vsxVRSIMjCAbd-mvN-PKpLAcOQVAc25MxOvB0rIRAqGPh22yI1Js8CD2_fvxAGklzkU2MIPbkAXiSpDJjfX0gMYWJmxsrmqpCSDIghwk_nkx4xlr3xK0JtenvjYAJJQvdmz6MDusZEuoqgYBV2bpy-MABeD5-SKBIBCCVAhRzXlGuK7SKiwVzXM5gL3G3_zgSdNhqYjC-XLEAAACAMtyjCg8mscEMTJdVxASvY2ZwtDPGbHyLdZCyuEmYgcjNBwCj5phfS-ownLiEFrcE6OojVadfQng3q2cPcFqjhroc2WxeC1CnHQZmHs_qST67HUlQQ6tTGMLO07AK6efLG24Fc5XdYtoMl_daYVZhrk-GmnbH4Owrz_YJiosirXrvkJHX5QAmxRCVMQkgnREq2E_KmhHebNj5Hl_lLvPEEX-BFJYNhVDqvbn8IrRkvPRdtuFW5lTB55g7gGDsXgxRCjwgNADuvKs-MfTCnelahoJ5uQIvJt04dk0N3L9Y8a-_nFXQhwS7JVaDKULXzbj37CD-_qOwIOgOK1o_26UUhSrV_h2ZzojOMns3ox-UttWrUzPDp4J9bvzCoczLrd0ZoojqgC3JfYTDGJ83fdSJUCbU91no_ctq_OO_kDBWS6wlvfRGdqTZ7tYIz7n0jKWzc3g8VilCGduLGMLjHVWCUJVM3_26SZlD6zqliqgGgKUeGTEIkvTQG9w72qdN_N3UAmO__j1ub02faCRFJumCUUg86Hv6cXas3DJPhbTVmq3vkiy_y6mc0o8LJ-pBz5ENZmAHnGHhfF3L7Nac9ZfffoQqp8HuMMjoxyqmL50OgiLWvZqTEpwTwTqxviw1APo7OBZuR0yJdPsvW2c-ny2nMA7g1nvANR7bx0Ntfa89qwdAQDo7exuF7NZOVL1VLD6TYApvGuw6Vtr8aOxp4lCCjOpQgAAAAAAAHX9I9ZUiPaZ1_OZ-T4HCpFJyhYe0i4tP3Mh0ORhSBfCNWX3vp9VhGIQ_ySDsL-1cJNernSgcJT6xUSNFUjBKWuqSw123rOfVgK0kDl6GNAqYCxI_eIu6KBuH7-5OI4cTu96AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB6rxiEoPYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHqvGISg9iDPwLxFEswNlzj2lko9l1CS1L5vugbqBSlr2aBdJXmNlwAZ6O3sbhezWTlS9VSw-k2AKbxrsOlba_GjsaeJQgozqUKfngjsO-nWTgJBA9j-hENSwX6PteThk1MmPbFUWD6MzU1gtx4jul5yiXtF6JhL4qgDqsB56YCMw0E6csT9VXPyy77lWOoKc4pITDz--D1HACJd1LVY2tLQ5DZKRvYzpq_N5bLCUenhiixgwcBKPw1Uri7ZfMQVyxRll8eKESKh2o1ExLXprHqUB54a1c8JlIsznVE2sbInKz_pMalIMNqZuclZK9sPNNHshWYi9n1pbL0rsn_Gg7ShanF7y0Tv-2ywQgtg5H2pwp8rSBKEnKP2Y-zDn0RRUqtV6Jmu6gBLSkv_ZYxoII7-sCsCJoAZMyrkHtsAibEMvuTDpM5R3mZt2oEL-jJ8umn5RmoXV3Xq6Oz5hNQA51MyiED_E0_rnIo1Ta2taBioFlYnKu_d3Mge9i5IIFzGWjhKw8eMW6LR7_JA3p3LQfNNnYGJ-fjDjpGUuIKCXBUUWKcjHcxh-t_vL6Dfl9HlqXEZKkBtkyZs5XbObtPsRauluQxvkqyI_I_-xcHxVO_fiIaM13LbGbWIQAkkVJkI8A02RyLQdq7eHkIjQ9gD1zb1yIvdgCM4ZiU8RAUZcSwMob3vaTj9GDdT5bFctm2dLzk3Q1tyZrT92LC0u6qwYZ7sIs8ZxtOX_z_fiQjv8P5cWfk5jk57bUAipLsrvPEIzuIrptuaTEutErB0ZZNnsSlNcrPyax2X00XJtl6_vqtmXyO9bPLw2GUlQZqwNp5fRVdDGBFCiuELW_H58SKMb9j-MVoiZaEWFUY_3rUof7OYLZ0W1a6Imr0ViK11rYM6NGrhbhKa0JlEmTjeTf6qiNMaiAVfZ6dTOOeODEtl4ievK_drwn4lSa6w_C20l1_QXxfq9WHyzwjnRLy5iE-MPYu73Ya_dzk6E2Pf5YDBfsN8pOZmKbO_Q9hns3ZEbRK6MI6p7UQPhtd4N9iNJENGVzKVzqYPcWKFiKtOv-NU95R-u0R2wm4jgaULQkF4NJkGMgp_yGVPW_atFsJ5NcNUojwsYva7XJ7s6OgAGejt7G4Xs1k5UvVUsPpNgCm8a7DpW2vxo7GniUIKM6lCS-CjSLFVcyDeuhA-xZo0j5nbj4_Vm7jq8nDhvPkD0MzRhfLr8BrfYY_eTSpYqbzUzoWh5qgvNftw_g2qDzZpkn2YpK4uinygtRb_AbFsM-sBeLTHSM3VooogGjBCbiU6n_aFQE2EubGek4H9fRrBVkpGVojAqHNXGxZcYhJ_k3KkwtPRxt-lWourgi9Gg1WnkZS4XbwhgDrIeRpRWmLiEVxD1a4WSzt_1Jqxw8iMUyX33A8cfobj7PX5sht_aif_RYFjv0m_VZbsW2G80zCFX0w_02D_GzmuDAdKxS8qEvfS6wEy7qstkCA_WzZysgA0sA86Vbv5CJZshKuyYBVUSLH_Nc2uZxH6tv6ajAVsl4HkWLgLhIKbDKh0zBnATzNgFV4jxpxbrF4mmnz55I_HNL0-iT2nfIf4g9DACTElXAATUxRrVYEQbRXsAU1l4Oap_MjE2N4QRE3bs36-BMkdFBQtiHrEFEYCtKaRLbcrbiKrfhDb1PM0aTwpK-Lr0qrpyZGGRKfwu6_iXih7CIHHjZ7yV5l4rPRdhv6ydUgnejkiY4ptqkS9BnxOfWJjV7J0ANyBZCtoYL7PhO0LPMHKYVvMREgkgc3hWk0rW6LIu_XA2H8gOsNu1stXRp--QJiK6QO_W1JifI_IiCJGvwTEEShgd1ClJ-erqOB0Od2lVLG1lDBZhLT5klWrVOnCwYvk4_03KMnzRiIIRyhM09Qjq86trAPFshJbiU34hgpdchqrn6b-BsuRhwMlmNM0otn7kp5I1lEP9CXKmVYeVdlMnCTJLDRy3LTWMwBvvrsPaYMVLFeW5BRsttvZcnGPZPNrDvkZ1_cCnetLPrnd6FJkirdE2EVj29iCaKC4pKMmKQzePrJhtbQ_00FpD_A4X0PqE_3elSFtijr8lqZGlUNLdv-cYADMa8K0f6mDEfvrDNFDOM-6gMoxitnPO3UmiQ5OCk6TpzZBFxr8zLlxl85o3S91ZfOewZIiTTJT5_7Xuj_E0h76EePgaXNiK5DZgrKiIP___vR4gOvqihtRRqrra4SWhoyk9rRJK9QI6To1wfcaAm0oAm0oL2P3vL68ZTIId1vj7ImFCaRLY4uUiNoSHFK_Xg3ZGTMBAAAAAQAAAAEBAAAABw-FrdSYOag")
// 	fmt.Printf("%v\n", buf)
// }
