package model

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/warp-contracts/syncer/src/utils/build_info"
	"github.com/warp-contracts/syncer/src/utils/common"
	"github.com/warp-contracts/syncer/src/utils/config"
	l "github.com/warp-contracts/syncer/src/utils/logger"
	"github.com/warp-contracts/syncer/src/utils/model/sql_migrations"

	migrate "github.com/rubenv/sql-migrate"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(ctx context.Context, config *config.Config, username, password, applicationName string) (self *gorm.DB, err error) {
	log := l.NewSublogger("db")

	logger := logger.New(log,
		logger.Config{
			SlowThreshold:             500 * time.Millisecond, // Slow SQL threshold
			LogLevel:                  logger.Error,           // Log level
			IgnoreRecordNotFoundError: true,                   // Ignore ErrRecordNotFound error for logger
			Colorful:                  false,                  // Disable color
		},
	)

	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s application_name=%s/warp.cc/%s",
		config.Database.Host,
		config.Database.Port,
		username,
		password,
		config.Database.Name,
		config.Database.SslMode,
		applicationName,
		build_info.Version,
	)

	if config.Database.CaCertPath != "" && config.Database.ClientKeyPath != "" && config.Database.ClientCertPath != "" {
		log.Info("Using SSL certificates from files")
		dsn += fmt.Sprintf(" sslcert=%s sslkey=%s sslrootcert=%s", config.Database.ClientCertPath, config.Database.ClientKeyPath, config.Database.CaCertPath)
	} else if config.Database.ClientKey != "" && config.Database.ClientCert != "" && config.Database.CaCert != "" {
		log.Info("Using SSL certificates from variables")

		var keyFile, certFile, caFile *os.File
		keyFile, err = os.CreateTemp("", "key.pem")
		if err != nil {
			return
		}
		defer os.Remove(keyFile.Name())
		_, err = keyFile.WriteString(config.Database.ClientKey)
		if err != nil {
			return
		}

		certFile, err = os.CreateTemp("", "cert.pem")
		if err != nil {
			return
		}
		defer os.Remove(certFile.Name())
		_, err = certFile.WriteString(config.Database.ClientCert)
		if err != nil {
			return
		}

		caFile, err = os.CreateTemp("", "ca.pem")
		if err != nil {
			return
		}
		defer os.Remove(caFile.Name())
		_, err = caFile.WriteString(config.Database.CaCert)
		if err != nil {
			return
		}

		dsn += fmt.Sprintf(" sslcert=%s sslkey=%s sslrootcert=%s", certFile.Name(), keyFile.Name(), caFile.Name())
	}

	self, err = gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger})
	if err != nil {
		return
	}

	db, err := self.DB()
	if err != nil {
		return
	}

	db.SetMaxOpenConns(config.Database.MaxOpenConns)
	db.SetMaxIdleConns(config.Database.MaxIdleConns)
	db.SetConnMaxIdleTime(config.Database.ConnMaxIdleTime)
	db.SetConnMaxLifetime(config.Database.ConnMaxLifetime)
	err = Ping(ctx, self)
	if err != nil {
		return
	}

	return
}

func NewConnection(ctx context.Context, config *config.Config, applicationName string) (self *gorm.DB, err error) {
	err = Migrate(ctx, config)
	if err != nil {
		return
	}

	return Connect(ctx, config, config.Database.User, config.Database.Password, applicationName)
}

func Migrate(ctx context.Context, config *config.Config) (err error) {
	log := l.NewSublogger("db-migrate")

	if config.Database.MigrationUser == "" || config.Database.MigrationPassword == "" {
		log.Info("Migration user not set, skipping migrations")
		return
	}

	// Run migrations
	migrations := &migrate.HttpFileSystemMigrationSource{
		FileSystem: http.FS(sql_migrations.FS),
	}

	// Use special migration user
	self, err := Connect(ctx, config, config.Database.MigrationUser, config.Database.MigrationPassword, "migration")
	if err != nil {
		return
	}

	db, err := self.DB()
	if err != nil {
		return
	}
	defer db.Close()

	n, err := migrate.Exec(db, "postgres", migrations, migrate.Up)
	if err != nil {
		return
	}

	log.WithField("num", n).Info("Applied migrations")

	config.Database.MigrationUser = ""
	config.Database.MigrationPassword = ""

	return
}

func Ping(ctx context.Context, db *gorm.DB) (err error) {
	config := common.GetConfig(ctx)

	if config.Database.PingTimeout < 0 {
		// Ping disabled
		return nil
	}

	sqlDB, err := db.DB()
	if err != nil {
		return
	}

	dbCtx, cancel := context.WithTimeout(ctx, config.Database.PingTimeout)
	defer cancel()

	err = sqlDB.PingContext(dbCtx)
	if err != nil {
		return
	}
	return
}
