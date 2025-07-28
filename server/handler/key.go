package handler

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"fmt"
	"strings"

	"github.com/btcsuite/btcd/btcutil/base58"
)

// DIDKey は、DIDに関連付けられた公開鍵と秘密鍵のペアを保持する構造体です。
type DIDKey struct {
	PublicKey  ecdsa.PublicKey
	PrivateKey *ecdsa.PrivateKey
}

// NewDIDKeyFromDID は、"did:key"形式の文字列からDIDKeyオブジェクトを生成します。
// DID文字列を解析し、公開鍵を復元します。秘密鍵は含まれません。
func NewDIDKeyFromDID(did string) (*DIDKey, error) {
	splited := strings.Split(did, ":")
	if len(splited) != 3 {
		return nil, fmt.Errorf("invalid did format")
	}

	if splited[0] != "did" {
		return nil, fmt.Errorf("invalid did scheme; scheme must be did")
	}
	if splited[1] != "key" {
		return nil, fmt.Errorf("invalid did method; did method must be key")
	}
	if splited[2] == "" {
		return nil, fmt.Errorf("invalid did key; must not be empty")
	}

	id := splited[2]

	if !strings.HasPrefix(id, "z") {
		return nil, fmt.Errorf("invalid did key; must start with z")
	}
	decoded := base58.Decode(id[1:])

	code, bytes, err := ParseMulticodec(decoded)
	if err != nil {
		return nil, err
	}
	if code != P256Pub {
		return nil, fmt.Errorf("multicodec not supported; code: %d", code)
	}
	if bytes == nil {
		return nil, fmt.Errorf("invalid did key; decoded bytes must not be nil")
	}
	if len(bytes) != 33 {
		return nil, fmt.Errorf("invalid did key; decoded bytes must be 33 bytes")
	}

	x, y := elliptic.UnmarshalCompressed(elliptic.P256(), bytes)
	return &DIDKey{
		PublicKey: ecdsa.PublicKey{
			Curve: elliptic.P256(),
			X:     x,
			Y:     y,
		},
		PrivateKey: nil,
	}, nil
}

// NewDIDKeyFromPrivateKey は、ecdsa.PrivateKeyオブジェクトからDIDKeyオブジェクトを生成します。
func NewDIDKeyFromPrivateKey(privateKey *ecdsa.PrivateKey) (*DIDKey, error) {
	return &DIDKey{
		PublicKey:  privateKey.PublicKey,
		PrivateKey: privateKey,
	}, nil
}

// DID は、DIDKeyの公開鍵から"did:key"形式の文字列を生成して返します。
func (did DIDKey) DID() string {
	encoded := base58.Encode(
		EncodeMulticodec(
			P256Pub,
			elliptic.MarshalCompressed(elliptic.P256(), did.PublicKey.X, did.PublicKey.Y),
		),
	)

	return fmt.Sprintf("did:key:z%s", encoded)
}
