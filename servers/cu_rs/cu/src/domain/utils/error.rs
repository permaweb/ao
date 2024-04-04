// use actix_web::error::Error;
// use valid::ValidationError;

// use crate::domain::validation::parse_schema::{get_violation_issues, ViolationIssue};

// pub fn err_from(err: Error) -> Error {
//     let mut final_err: Option<Error> = None;
//     /**
//      * Imperative to not inflate the stack trace
//      */
//     if let Some(e) = err.as_error<ValidationError>() {
//       e = map_val_error(e);
//       e.stack += err.stack
//     } else if (is(Error, err)) {
//       e = err
//     } else if (has('message', err)) {
//       e = new Error(err.message)
//     } else if (is(String, err)) {
//       e = new Error(err)
//     } else {
//       e = new Error('An error occurred')
//     }
  
//     /**
//      * If this is a named error, we make sure to include its name
//      * in the error message
//      */
//     if (!is(ZodError, err) && isNamed(err)) e.message = `${err.name}: ${e.message}`
  
//     return final_err.unwrap()
//   }

//   fn map_val_error (val_err: ValidationError) {
//     let first = gather_zod_issues(val_err, 400, "".to_string());

//     return pipe(
//       (val_err) => (
        
//       ),
//       /**
//          * combine all zod issues into a list of { message, status }
//          * summaries of each issue
//          */
//       (zodIssues) =>
//         reduce(
//           (acc, zodIssue) => {
//             const { message, path: _path, contextCode: _contextCode } = zodIssue
//             /**
//                * if object, path[1] will be the object key and path[0] '0', so just skip it
//                * if string, path[0] will be the string and path[1] undefined
//                */
//             const path = _path[1] || _path[0]
//             const contextCode = _contextCode ? `${_contextCode} ` : ''
  
//             acc.push(`${contextCode}'${path}': ${message}.`)
//             return acc
//           },
//           [],
//           zodIssues
//         ),
//       join(' | ')
//     )(val_err)
//   }

//   /**
//      * Take a ZodError and flatten it's issues into a single depth array
//      */
// fn gather_zod_issues (val_err: ValidationError, status: String, context_code: String) {
//     let issues = get_violation_issues(val_err);
//     let final_issues: Vec<ViolationIssue> = vec![];

//     for issue in issues.iter() {
//         final_issues.push()
//     }
// }