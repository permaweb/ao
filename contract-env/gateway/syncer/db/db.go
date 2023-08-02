package db

import (
	"bufio"
	"database/sql"
	"fmt"
	"github.com/everFinance/arsyncer"
	_ "github.com/lib/pq"
	"github.com/redstone-finance/redstone-sw-gateway/syncer/sw_types"
	"os"
	"strings"
)

var log = arsyncer.NewLog("db")

type Db struct {
	connectionParams ConnectionParams
	connection       *sql.DB
}

type ConnectionParams struct {
	Host     string
	Port     int
	User     string
	Password string
	Dbname   string
}

type AppConfigProperties map[string]string

func New(connectionParams ConnectionParams) *Db {
	return &Db{
		connectionParams: connectionParams,
		connection:       connectDb(connectionParams),
	}
}

func (db *Db) Close() {
	err := db.connection.Close()
	if err != nil {
		return
	}
}

func (db *Db) LoadLatestSyncedBlock() int64 {
	sqlStatement := `SELECT last_checked_height AS blockHeight FROM arsyncer;`
	var blockHeight int64
	row := db.connection.QueryRow(sqlStatement)
	switch err := row.Scan(&blockHeight); err {
	case sql.ErrNoRows:
		log.Error("No rows were returned!")
	case nil:
		log.Info("Last synced block", "height", blockHeight)
	default:
		panic(err)
	}

	return blockHeight
}

func (db *Db) BatchInsertInteractions(interactions []sw_types.DbInteraction) error {
	var valueStrings []string
	var valueArgs []interface{}
	for _, interaction := range interactions {
		valueStrings = append(valueStrings, "(?, ?, ?, ?, ?, ?, ?, ?)")

		valueArgs = append(valueArgs, interaction.InteractionId)
		valueArgs = append(valueArgs, interaction.Interaction)
		valueArgs = append(valueArgs, interaction.BlockHeight)
		valueArgs = append(valueArgs, interaction.BlockId)
		valueArgs = append(valueArgs, interaction.ContractId)
		valueArgs = append(valueArgs, interaction.Function)
		valueArgs = append(valueArgs, interaction.Input)
		valueArgs = append(valueArgs, interaction.ConfirmationStatus)

		smt := `
INSERT INTO interactions(
interaction_id, interaction, block_height, block_id, contract_id, function, input, confirmation_status) 
VALUES %s 
ON CONFLICT (interaction_id) 
DO NOTHING`
		smt = fmt.Sprintf(smt, strings.Join(valueStrings, ","))
		log.Debug("smttt:", smt)
		tx, _ := db.connection.Begin()
		_, err := tx.Exec(smt, valueArgs...)
		if err != nil {
			tx.Rollback()
			return err
		}
		return tx.Commit()
	}

	return nil
}

func (db *Db) UpdateLastProcessedInteractionHeight(height int64) {
	sqlStatement := `UPDATE arsyncer SET last_checked_height = $1;`

	_, err := db.connection.Exec(sqlStatement, height)
	if err != nil {
		log.Error("Error while updating last checked height", err)
	}
}

func connectDb(params ConnectionParams) *sql.DB {
	psqlInfo := fmt.Sprintf("host=%s port=%d user=%s "+
		"password=%s dbname=%s sslmode=disable",
		params.Host, params.Port, params.User, params.Password, params.Dbname)

	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		panic(err)
	}

	err = db.Ping()
	if err != nil {
		panic(err)
	}

	log.Info("Successfully connected!")
	return db
}

func ReadPropertiesFile(filename string) (AppConfigProperties, error) {
	config := AppConfigProperties{}

	if len(filename) == 0 {
		return config, nil
	}
	file, err := os.Open(filename)
	if err != nil {
		log.Error("Cannot open file", filename, err)
		return nil, err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if equal := strings.Index(line, "="); equal >= 0 {
			if key := strings.TrimSpace(line[:equal]); len(key) > 0 {
				value := ""
				if len(line) > equal {
					value = strings.TrimSpace(line[equal+1:])
				}
				config[key] = value
			}
		}
	}

	if err := scanner.Err(); err != nil {
		log.Error("Cannot parse file", err)
		return nil, err
	}

	return config, nil
}
