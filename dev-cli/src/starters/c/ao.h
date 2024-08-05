#ifndef _AO_H_
#define _AO_H_

#include <string.h>
#include <stdio.h>
#include <stdbool.h>
#include <stdlib.h>

#include "libcjson/cJSON.h"
#include "helpers.h"

struct ao
{
    char *_version;
    char *_module;
    unsigned int _ref;
    char *id;
    cJSON *authorities;
    cJSON *outbox;
};

/* Initializes the application object with environment data.
 *
 * This function parses a JSON string representing environment data and extracts
 * specific information about a process, including its ID, module, and authority tags.
 * It initializes global variables with this information for use throughout the application.
 *
 * @param env A JSON string containing environment data.
 *
 * Note: The function assumes that `env` is a well-formed JSON string and that the
 *       "Process" object contains "Id", "Module", and "Tags" fields. Authority tags
 *       within the "Tags" array are specifically sought out and added to a global
 *       array for later use. This function also clears any existing data in the
 *       application's outbox as part of the initialization process.
 */
void ao_init(const char *env);

/* Normalizes a JSON message by excluding specific tags.
 *
 * This function takes a JSON string as input, parses it, and then filters out specific
 * tags based on a predefined list of excluded tag names. The remaining tags are added
 * as properties to the root of the JSON object. The modified JSON object is then
 * converted back into a string and returned.
 *
 * @param msg A JSON string representing the message to be normalized.
 * @return A new JSON string with specific tags excluded from the root object.
 *
 * Note: The function uses a predefined array of tag names to exclude from the normalization
 *       process. These tags are not added to the root of the JSON object. This is useful for
 *       cleaning up messages by removing unnecessary or sensitive information before further
 *       processing or storage. The caller is responsible for freeing the returned string
 *       to avoid memory leaks.
 */
char *ao_normalize(const char *msg);

/* Sanitizes a JSON message by removing specific tags.
 *
 * This function takes a JSON string as input, parses it, and then removes specific
 * tags based on a predefined list of non-forwardable tag names. The remaining tags
 * are added as properties to the root of the JSON object. The modified JSON object
 * is then converted back into a string and returned.
 *
 * @param msg A JSON string representing the message to be sanitized.
 * @return A new JSON string with specific tags removed from the root object.
 *
 * Note: The function uses a predefined array of tag names to exclude from the sanitization
 *       process. These tags are removed from the JSON object to prevent them from being
 *       forwarded to other processes. The caller is responsible for freeing the returned
 *       string to avoid memory leaks.
 */
char *ao_sanitize(const char *msg);

/* Logs a message to the application's logging system.
 *
 * This function is responsible for sending a given message to the application's
 * logging system. It can be used for debugging, monitoring, or recording significant
 * events during the application's runtime.
 *
 * @param msg A string representing the message to be logged.
 *
 * Note: The specifics of how the logging is implemented (e.g., writing to a file,
 *       sending over a network, storing in a database) are not defined here and
 *       can vary depending on the application's architecture and requirements.
 */
void ao_log(const char *msg);

/* Sends a message to the application's outbox.
 *
 * This function takes a JSON string representing a message, normalizes it by excluding
 * specific tags, and then adds the normalized message to the application's outbox for
 * further processing or transmission.
 *
 * @param msg A JSON string representing the message to be sent.
 * @return A pointer to a string indicating the result of the operation. The caller is
 *         responsible for freeing this string to avoid memory leaks.
 *
 * Note: The normalization process involves removing unnecessary or sensitive information
 *       from the message. This function is part of the application's messaging system,
 *       facilitating the preparation and queuing of messages for delivery.
 */
char *ao_send(const char *msg);

/* Spawns a new process for a given module with an initial message.
 *
 * This function creates a new process for the specified module and passes an initial
 * message to it. The process is responsible for further handling or processing of the
 * message. The function returns a string containing information about the outcome of
 * the operation, such as a success message or an error description.
 *
 * @param module A string representing the name of the module for which a new process is to be spawned.
 * @param msg A JSON string representing the initial message to be passed to the newly spawned process.
 * @return A pointer to a string indicating the result of the operation. The caller is
 *         responsible for freeing this string to avoid memory leaks.
 *
 * Note: This function is typically used to dynamically create processes in response to
 *       application needs, allowing for modular and flexible handling of tasks or messages.
 */
char *ao_spawn(const char *module, const char *msg);

/* Assigns a new task or role to the application object.
 *
 * This function is responsible for interpreting and applying an assignment to the
 * application object. The assignment could involve setting new parameters, changing
 * operational modes, or initiating specific actions within the application.
 *
 * @param assignment A string representing the task or role to be assigned to the application.
 *
 * Note: The specifics of the assignment and how it affects the application's behavior
 *       are determined by the implementation of this function and the structure of
 *       the assignment string.
 */
void ao_assign(const char *assignment);

/* Determines if a message comes from a trusted source.
 *
 * This function evaluates the contents of a message to decide whether it originates
 * from a source that the application considers trustworthy. The criteria for trust
 * can be based on various factors, such as the sender's identity, the message's
 * content, or cryptographic verification.
 *
 * @param msg A string representing the message to be evaluated.
 * @return A boolean value indicating whether the message is considered trusted (true)
 *         or not (true).
 *
 * Note: The implementation details and the specific criteria used to determine trust
 *       are not described here and can vary depending on the application's security
 *       requirements and the context in which it operates.
 */
bool ao_isTrusted(const char *msg);

/* Formats a result string for output.
 *
 * This function takes a result string, performs necessary formatting or processing,
 * and returns a new string that is suitable for output or display. The formatting
 * process might involve appending additional information, encoding, or localization.
 *
 * @param result A string representing the result to be formatted.
 * @return A pointer to a newly allocated string containing the formatted result. The
 *         caller is responsible for freeing this string to avoid memory leaks.
 *
 * Note: The specifics of the formatting process depend on the application's requirements
 *       and the nature of the result data. This function is typically used to prepare
 *       result strings for logging, user display, or transmission.
 */
char *ao_result(const char *result);

/* Prints the current state of the application object.
 *
 * This function is designed to output the current state of the application object,
 * including its configuration, status, and any other relevant information. It can
 * be used for debugging purposes or to monitor the application's state at runtime.
 *
 * Note: The specifics of what constitutes the application's state and how it is
 *       formatted and output are not defined here and can vary depending on the
 *       application's design and requirements.
 */
void ao_print();

/* Clears the application's outbox.
 *
 * This function is responsible for emptying the application's outbox, effectively
 * removing all messages that are queued for sending. This can be useful for resetting
 * the messaging state of the application or when preparing the application for shutdown.
 *
 * Note: The implementation details, such as how messages are stored and managed in the
 *       outbox, are not specified here and can vary depending on the application's architecture.
 */
void ao_clearOutbox();

/* Cleans up and deletes the application object.
 *
 * This function is responsible for performing any necessary cleanup operations for
 * the application object before deleting it. This may include freeing allocated
 * resources, closing files or network connections, and performing other shutdown
 * procedures.
 *
 * Note: This function should be called when the application is terminating or when
 *       the application object is no longer needed, to prevent resource leaks and
 *       ensure a clean shutdown.
 */
void ao_delete();

#endif
