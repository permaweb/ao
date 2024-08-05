
#include "./ao.h"
#include <stdio.h>
#include <stdlib.h>

/* Handles the processing of a message within a specific environment.
 *
 * @param msg A string representing the message to be processed.
 * @param env A string representing the environment settings to be used for processing the message.
 * @return A pointer to a string indicating the result of the message processing. This may include
 *         a response message or an indication of success or failure. The caller may need to handle
 *         or display this result according to the application's requirements.
 */
const char *process_handle(const char *msg, const char *env)
{
  // Initialize the process with the given environment settings
  ao_init(env);

  // Normalize the incoming message
  char * norm = ao_normalize(msg);
  ao_log("Normalize");
  printf("norm: %s\n", norm);

  // Send the normalized message
  ao_log("Send");
  char * send = ao_send(norm);
  printf("send: %s\n", send);


  // Free allocated memory to prevent memory leaks
  free(norm);
  free(send);

  // Return a static response
  return "{\"ok\": true,\"response\":{\"Output\":\"Success\" },\"Memory\":50000000}";
}