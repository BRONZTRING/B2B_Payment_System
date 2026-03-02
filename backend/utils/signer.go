package utils

import (
	"fmt"
	"math/big"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/common/math"
	"github.com/ethereum/go-ethereum/crypto"
)

// GenerateRiskSignature 模拟 Solidity 的 abi.encodePacked 并生成 EIP-191 签名
// 参数必须与合约中的 createOrder 参数顺序、类型严格一致
func GenerateRiskSignature(
	privateKeyHex string,
	buyer common.Address,
	seller common.Address,
	token common.Address,
	amount *big.Int,
	goodsHash [32]byte,
	deadline *big.Int,
	chainId *big.Int,
) (string, error) {

	// 1. 解析私钥
	// 去掉可能存在的 "0x" 前缀
	if len(privateKeyHex) > 2 && privateKeyHex[:2] == "0x" {
		privateKeyHex = privateKeyHex[2:]
	}
	privateKey, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		return "", fmt.Errorf("invalid private key: %v", err)
	}

	// 2. 数据打包 (Packing)
	// 对应 Solidity: abi.encodePacked(buyer, seller, token, amount, goodsHash, deadline, chainId)
	// 注意：Address 是 20 字节，uint256 是 32 字节，bytes32 是 32 字节
	var data []byte

	data = append(data, buyer.Bytes()...)
	data = append(data, seller.Bytes()...)
	data = append(data, token.Bytes()...)
	data = append(data, math.PaddedBigBytes(amount, 32)...)   // uint256
	data = append(data, goodsHash[:]...)                      // bytes32
	data = append(data, math.PaddedBigBytes(deadline, 32)...) // uint256
	data = append(data, math.PaddedBigBytes(chainId, 32)...)  // uint256

	// 3. 计算原始哈希 (Keccak256)
	hash := crypto.Keccak256Hash(data)

	// 4. 计算 EIP-191 签名哈希 (以太坊签名标准前缀)
	// 对应 Solidity: MessageHashUtils.toEthSignedMessageHash(messageHash)
	prefix := fmt.Sprintf("\x19Ethereum Signed Message:\n32")
	prefixedHash := crypto.Keccak256Hash([]byte(prefix), hash.Bytes())

	// 5. 使用私钥签名
	signatureBytes, err := crypto.Sign(prefixedHash.Bytes(), privateKey)
	if err != nil {
		return "", fmt.Errorf("signing failed: %v", err)
	}

	// 6. 修正 V 值 (Recovery ID)
	// go-ethereum 生成的 V 是 0或1，但 Solidity 需要 27或28
	if signatureBytes[64] < 27 {
		signatureBytes[64] += 27
	}

	// 7. 返回十六进制字符串 (带 0x)
	return hexutil.Encode(signatureBytes), nil
}
