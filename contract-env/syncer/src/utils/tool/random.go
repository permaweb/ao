package tool

import (
	crypto_rand "crypto/rand"
	"math/rand"
	"time"
)

const letterBytes = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

func init() {
	rand.Seed(time.Now().UnixNano())
}

func RandomString(n int) string {
	b := make([]byte, n)
	for i := range b {
		b[i] = letterBytes[rand.Intn(len(letterBytes))]
	}
	return string(b)
}
func CryptoRandomBytes(n int) []byte {
	b := make([]byte, n)
	_, err := crypto_rand.Read(b)
	if err != nil {
		return []byte{}
	}
	return b
}
