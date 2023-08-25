package tool

func AppendMap[K comparable, V comparable](out map[K]V, maps ...map[K]V) map[K]V {
	for _, m := range maps {
		for k, v := range m {
			out[k] = v
		}
	}
	return out
}
