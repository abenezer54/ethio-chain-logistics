package blockchain

import (
	"context"
	"crypto/ecdsa"
	"errors"
	"fmt"
	"math/big"
	"strings"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

var ErrRecordAlreadyAnchored = errors.New("record hash is already anchored")

const shipmentAnchorABI = `[
  {
    "inputs": [
      {"internalType":"bytes32","name":"shipmentKey","type":"bytes32"},
      {"internalType":"bytes32","name":"recordHash","type":"bytes32"},
      {"internalType":"bytes32","name":"previousHash","type":"bytes32"},
      {"internalType":"uint8","name":"recordType","type":"uint8"}
    ],
    "name":"anchorRecord",
    "outputs":[],
    "stateMutability":"nonpayable",
    "type":"function"
  },
  {
    "inputs":[{"internalType":"bytes32","name":"recordHash","type":"bytes32"}],
    "name":"isAnchored",
    "outputs":[{"internalType":"bool","name":"","type":"bool"}],
    "stateMutability":"view",
    "type":"function"
  }
]`

type EthereumConfig struct {
	RPCURL          string
	ChainID         string
	PrivateKey      string
	ContractAddress string
}

type EthereumAnchorClient struct {
	eth        *ethclient.Client
	contract   *bind.BoundContract
	privateKey *ecdsa.PrivateKey
	chainID    *big.Int
}

func NewEthereumAnchorClient(ctx context.Context, cfg EthereumConfig) (*EthereumAnchorClient, error) {
	chainID, ok := new(big.Int).SetString(strings.TrimSpace(cfg.ChainID), 10)
	if !ok || chainID.Sign() <= 0 {
		return nil, fmt.Errorf("invalid chain id")
	}
	if !common.IsHexAddress(cfg.ContractAddress) {
		return nil, fmt.Errorf("invalid anchor contract address")
	}
	privateKeyHex := strings.TrimPrefix(strings.TrimSpace(cfg.PrivateKey), "0x")
	privateKey, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		return nil, fmt.Errorf("parse blockchain private key: %w", err)
	}
	eth, err := ethclient.DialContext(ctx, strings.TrimSpace(cfg.RPCURL))
	if err != nil {
		return nil, fmt.Errorf("connect ethereum rpc: %w", err)
	}
	parsedABI, err := abi.JSON(strings.NewReader(shipmentAnchorABI))
	if err != nil {
		eth.Close()
		return nil, fmt.Errorf("parse shipment anchor abi: %w", err)
	}
	contract := bind.NewBoundContract(common.HexToAddress(cfg.ContractAddress), parsedABI, eth, eth, eth)
	return &EthereumAnchorClient{
		eth:        eth,
		contract:   contract,
		privateKey: privateKey,
		chainID:    chainID,
	}, nil
}

func (c *EthereumAnchorClient) Close() {
	if c != nil && c.eth != nil {
		c.eth.Close()
	}
}

func (c *EthereumAnchorClient) AnchorRecord(ctx context.Context, job domain.AnchorJob) (string, error) {
	recordHash, err := hashFromHex(job.RecordHash)
	if err != nil {
		return "", err
	}
	previousHash := common.Hash{}
	if strings.TrimSpace(job.PreviousHash) != "" {
		previousHash, err = hashFromHex(job.PreviousHash)
		if err != nil {
			return "", err
		}
	}

	alreadyAnchored, err := c.isAnchored(ctx, recordHash)
	if err != nil {
		return "", err
	}
	if alreadyAnchored {
		return "", ErrRecordAlreadyAnchored
	}

	auth, err := bind.NewKeyedTransactorWithChainID(c.privateKey, c.chainID)
	if err != nil {
		return "", fmt.Errorf("create ethereum transaction signer: %w", err)
	}
	auth.Context = ctx

	shipmentKey := crypto.Keccak256Hash([]byte(job.ShipmentID))
	tx, err := c.contract.Transact(auth, "anchorRecord", shipmentKey, recordHash, previousHash, uint8(job.RecordType))
	if err != nil {
		return "", fmt.Errorf("submit anchor transaction: %w", err)
	}
	receipt, err := bind.WaitMined(ctx, c.eth, tx)
	if err != nil {
		return "", fmt.Errorf("wait for anchor transaction %s: %w", tx.Hash().Hex(), err)
	}
	if receipt.Status != types.ReceiptStatusSuccessful {
		return "", fmt.Errorf("anchor transaction %s failed on-chain", tx.Hash().Hex())
	}
	return tx.Hash().Hex(), nil
}

func (c *EthereumAnchorClient) isAnchored(ctx context.Context, recordHash common.Hash) (bool, error) {
	var out []any
	callOpts := &bind.CallOpts{Context: ctx}
	if err := c.contract.Call(callOpts, &out, "isAnchored", recordHash); err != nil {
		return false, fmt.Errorf("check anchored hash: %w", err)
	}
	if len(out) != 1 {
		return false, fmt.Errorf("unexpected isAnchored result")
	}
	anchored, ok := out[0].(bool)
	if !ok {
		return false, fmt.Errorf("unexpected isAnchored result type")
	}
	return anchored, nil
}

func hashFromHex(value string) (common.Hash, error) {
	clean := strings.TrimPrefix(strings.TrimSpace(strings.ToLower(value)), "0x")
	if len(clean) != 64 {
		return common.Hash{}, fmt.Errorf("hash must be 32 bytes hex")
	}
	return common.HexToHash("0x" + clean), nil
}
