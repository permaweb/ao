#[doc(hidden)]
use core::cell::RefCell;

/// Tiny wrapper over RefCell.
///
/// It allows
/// - allow for uninitialized values (by storing Option)
/// - allow static usage (by implementing Sync and providing a const constructor)
///
/// Because WASM is single-threaded, we don't need to worry much about inter-thread communication
pub struct OptionalCell<T> {
    pub cell: RefCell<Option<T>>,
}

impl<T> OptionalCell<T> {
    pub const fn empty() -> OptionalCell<T> {
        OptionalCell {
            cell: RefCell::new(None),
        }
    }
    pub fn is_empty(&self) -> bool {
        self.cell.borrow().is_none()
    }
}

// Add clone_content to OptionalCell only if T is known to implement Clone.
// In particular to use is_empty on OptionalCell trait Clone is not required on T.
pub trait CloneContents<T: Clone> {
    fn clone_contents(&self) -> T;
}

impl<T: Clone> CloneContents<T> for OptionalCell<T> {
    fn clone_contents(&self) -> T {
        self.cell.borrow().as_ref().unwrap().clone()
    }
}

unsafe impl<T> Sync for OptionalCell<T> {}
