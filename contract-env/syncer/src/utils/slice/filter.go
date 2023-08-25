package slice

func Filter[T any](in []T, f func(T) bool) []T {
	out := make([]T, 0, len(in))
	for _, v := range in {
		if f(v) {
			out = append(out, v)
		}
	}
	return out
}
