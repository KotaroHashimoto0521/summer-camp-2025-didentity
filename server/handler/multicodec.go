package handler

import (
	"encoding/binary"
	"fmt"
)

// P256Pub は、secp256r1 (P-256) の公開鍵を示すmulticodecコードです。
const (
	P256Pub = 0x1200
)

// ParseMulticodec は、multicodec形式のバイト配列を解析し、
// コーデックコードと実際のデータ部分を分離して返します。
func ParseMulticodec(multicodec []byte) (uint64, []byte, error) {
	code, n := binary.Uvarint(multicodec)
	if n <= 0 {
		return 0, nil, fmt.Errorf("invalid multicodec; varint overflow")
	}

	return code, multicodec[n:], nil
}

// EncodeMulticodec は、与えられたコーデックコードとデータから
// multicodec形式のバイト配列を生成します。
func EncodeMulticodec(code uint64, bytes []byte) []byte {
	buf := make([]byte, binary.MaxVarintLen64)
	n := binary.PutUvarint(buf, code)
	return append(buf[:n], bytes...)
}
