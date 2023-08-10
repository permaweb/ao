// What we try to achieve here is setting a common lifetime for State and Future objects
// but using higher-ranked trait bounds (https://doc.rust-lang.org/reference/trait-bounds.html#higher-ranked-trait-bounds),
// i.e. impossible to specify on the call side (see the use of this trait).
// The effect is somewhat opposite to 'static lifetime, the lifetime shorter than anything passed by the user.
// Inspired by https://stackoverflow.com/a/63558160/3021277
pub trait BorrowingFn<'a, S, A, V> {
    type Fut: core::future::Future<Output = V> + 'a;
    fn call(self, state: &'a S, action: A) -> Self::Fut;
}

impl<'a, Fu: 'a, F, S: 'a, A, V> BorrowingFn<'a, S, A, V> for F
where
    F: FnOnce(&'a S, A) -> Fu,
    Fu: core::future::Future<Output = V> + 'a,
{
    type Fut = Fu;
    fn call(self, state: &'a S, action: A) -> Fu {
        self(state, action)
    }
}
