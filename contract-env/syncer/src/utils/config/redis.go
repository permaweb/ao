package config

import (
	"fmt"
	"time"

	"github.com/mitchellh/mapstructure"
	"github.com/spf13/viper"
)

type Redis struct {
	Port     uint16
	Host     string
	User     string
	Password string
	DB       int

	// TLS configuration
	ClientKey  string
	ClientCert string
	CaCert     string
	EnableTLS  bool

	// Connection configuration
	MinIdleConns    int
	MaxIdleConns    int
	ConnMaxIdleTime time.Duration
	MaxOpenConns    int
	ConnMaxLifetime time.Duration

	// Publish backoff configuration, 0 is no limit
	MaxElapsedTime time.Duration
	MaxInterval    time.Duration

	// Num of workers that publish messages
	MaxWorkers int

	// Max num of requests in worker's queue
	MaxQueueSize int
}

func unmarshalRedis(config *Config) error {
	config.Redis = make([]Redis, getSliceLength("redis"))

	settings := viper.AllSettings()
	for i := range config.Redis {

		data := Redis{
			Port:            6379,
			Host:            "localhost",
			DB:              0,
			Password:        "password",
			EnableTLS:       true,
			MinIdleConns:    1,
			MaxIdleConns:    5,
			ConnMaxIdleTime: 10 * time.Minute,
			MaxOpenConns:    15,
			ConnMaxLifetime: time.Hour,
			MaxElapsedTime:  10 * time.Minute,
			MaxInterval:     60 * time.Second,
			MaxWorkers:      15,
			MaxQueueSize:    1,
		}

		decoder, err := mapstructure.NewDecoder(defaultDecoderConfig(&data))
		if err != nil {
			return err
		}
		err = decoder.Decode(settings[fmt.Sprintf("redis[%d]", i)])
		if err != nil {
			fmt.Println("error:", err)
			continue
		}

		config.Redis[i] = data

	}
	return nil
}

func setRedisDefaults() {
	viper.SetDefault("Redis[0].Port", "6379")
	viper.SetDefault("Redis[0].Host", "localhost")
	viper.SetDefault("Redis[0].User", "")
	viper.SetDefault("Redis[0].Password", "password")
	viper.SetDefault("Redis[0].EnableTLS", "false")
	viper.SetDefault("Redis[0].DB", "0")
	viper.SetDefault("Redis[0].MinIdleConns", "1")
	viper.SetDefault("Redis[0].MaxIdleConns", "5")
	viper.SetDefault("Redis[0].ConnMaxIdleTime", "2m")
	viper.SetDefault("Redis[0].MaxOpenConns", "15")
	viper.SetDefault("Redis[0].ConnMaxLifetime", "1h")
	viper.SetDefault("Redis[0].MaxElapsedTime", "10m")
	viper.SetDefault("Redis[0].MaxInterval", "60s")
	viper.SetDefault("Redis[0].MaxWorkers", "15")
	viper.SetDefault("Redis[0].MaxQueueSize", "10")
}
