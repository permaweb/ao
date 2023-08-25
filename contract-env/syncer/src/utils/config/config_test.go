package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
)

// Test file is missing
func TestMissingFile(t *testing.T) {
	_, err := Load("")
	assert.Nil(t, err)

	filename := "test"
	_, err = Load(filename)
	assert.NotNil(t, err)
}

type ConfigTestSuite struct {
	suite.Suite
	Config *Config
}

func (suite *ConfigTestSuite) SetupTest() {
	var err error
	suite.Config, err = Load("config.json")
	if err != nil {
		panic("Failed to load config.json from file " + err.Error())
	}
}
func TestConfigTestSuite(t *testing.T) {
	suite.Run(t, new(ConfigTestSuite))
}

func TestLoadConfigFromEnv(t *testing.T) {
	os.Setenv("SYNCER_DBNAME", "qwer")

	c, err := Load("config.json")
	if err != nil {
		panic(err)
	}

	assert.Equal(t, "warp", c.Database.Name)
}
