#ifndef _AO_HELPERS_H_
#define _AO_HELPERS_H_

#include <string.h>
#include <stdio.h>
#include <stdbool.h>
#include <stdlib.h>
#include "libcjson/cJSON.h"

/* Converts an unsigned integer to a 32-character zero-padded string.
 *
 * @param num The unsigned integer to convert.
 * @return A dynamically allocated string of the padded number. Caller must free it.
 */
char *PadZero32(unsigned int num);

/* Appends a named tag to a cJSON array, ensuring input safety.
 *
 * @param tags Pointer to the cJSON array for tag addition.
 * @param tagName Name of the tag.
 * @param tagValue Value of the tag.
 *
 * Note: Exits early if any parameter is NULL, without changes to the array.
 */
void AddTagToArray(cJSON *tags, const char *tagName, const char *tagValue);

/* Gets a string from a cJSON object by key.
 *
 * @param object cJSON object pointer.
 * @param key Key for the value to retrieve.
 * @return Dynamically allocated string or NULL if key not found or error.
 *         Caller must free the returned string.
 */
char *GetStringFromJSON(const cJSON *object, const char *key);

/* Filters and adds non-persistent tags from one cJSON array to another.
 *
 * @param msgTags Source cJSON array of tags.
 * @param tags Destination cJSON array for non-persistent tags.
 * @param persistentTags Array of persistent tag names.
 * @param numPersistentTags Count of persistent tag names.
 *
 * Duplicates and adds tags to `tags` if they're not in `persistentTags`.
 */
void AddNonPersistentTags(cJSON *msgTags, cJSON *tags, const char **persistentTags, size_t numPersistentTags);

/* Adds selected tags as properties to a cJSON object.
 *
 * Iterates through tags, excluding specified ones, and adds the rest to `msgJson`.
 *
 * @param msgJson cJSON object to add tags to.
 * @param tags cJSON array of tags to consider.
 * @param excludedTags Tags to exclude.
 * @param numExcludedTags Number of tags to exclude.
 */
void AddNonExcludedTagsAsProperties(cJSON *msgJson, cJSON *tags, const char **excludedTags, size_t numExcludedTags);

/* Copies a string value from one cJSON object to another based on a key.
 *
 * @param source Source cJSON object.
 * @param destination Destination cJSON object where the value is added.
 * @param key Key of the value to copy.
 *
 * Only copies if the key exists in `source` and its value is a string.
 */
void AddStringToJSONIfExists(cJSON *source, cJSON *destination, const char *key);

/* Checks if a string is present in an array of strings.
 *
 * @param str The string to search for.
 * @param arr The array of strings to search in.
 * @param size The size of the array.
 * @return true if the string is found, false otherwise.
 */
bool IsStringInArray(const char *str, const char **arr, size_t size);

#endif
