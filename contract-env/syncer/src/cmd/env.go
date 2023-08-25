package cmd

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/warp-contracts/syncer/src/utils/config"

	"github.com/iancoleman/strcase"
	"github.com/spf13/cobra"
)

func init() {
	RootCmd.AddCommand(envCmd)
}

func visit(path []string, val reflect.Value) {
	if val.Kind() != reflect.Struct {
		env := "SYNCER_" + strcase.ToScreamingSnake(strings.Join(path, "_"))
		fmt.Println(env)
	} else {
		for i := 0; i < val.NumField(); i++ {
			newPath := make([]string, len(path))
			copy(newPath, path)
			newPath = append(newPath, val.Type().Field(i).Name)
			visit(newPath, val.Field(i))
		}
	}
}

var envCmd = &cobra.Command{
	Use:   "env",
	Short: "Prints all ENV variable names",
	Run: func(cmd *cobra.Command, args []string) {
		visit(nil, reflect.ValueOf(config.Config{}))
	},
	PostRunE: func(cmd *cobra.Command, args []string) (err error) {
		applicationCtxCancel()
		return
	},
}
