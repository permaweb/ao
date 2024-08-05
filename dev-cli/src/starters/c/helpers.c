#include "helpers.h"

char *PadZero32(unsigned int num)
{
    // Allocate memory for a 32-character string plus the null terminator.
    char *buffer = (char *)malloc(33 * sizeof(char));
    if (buffer == NULL)
        return NULL; // Check if malloc failed and return NULL if so.

    // Use sprintf to format the number with leading zeros into the buffer.
    sprintf(buffer, "%032d", num);

    return buffer; // Return the pointer to the padded string.
}

void AddTagToArray(cJSON *tags, const char *tagName, const char *tagValue)
{
    // Perform safety checks on the input parameters.
    if (tags == NULL || tagName == NULL || tagValue == NULL)
    {
        return; // If any parameter is NULL, exit the function early.
    }

    // Create a new cJSON object for the tag.
    cJSON *tagObject = cJSON_CreateObject();

    // Add the tag name and value to the newly created cJSON object.
    cJSON_AddStringToObject(tagObject, "name", tagName);
    cJSON_AddStringToObject(tagObject, "value", tagValue);

    // Append the tag object to the provided cJSON array.
    cJSON_AddItemToArray(tags, tagObject);
}

char *GetStringFromJSON(const cJSON *object, const char *key)
{
    // Validate input parameters.
    if (object == NULL || key == NULL)
    {
        return NULL; // Return NULL if input is invalid.
    }

    // Attempt to retrieve the item from the JSON object.
    const cJSON *item = cJSON_GetObjectItemCaseSensitive(object, key);
    if (item == NULL)
    {
        return NULL; // Return NULL if the key is not found.
    }

    // Attempt to get the string value of the item.
    const char *value = cJSON_GetStringValue(item);
    if (value == NULL)
    {
        return NULL; // Return NULL if the item is not a string or its value is NULL.
    }

    // Allocate memory for the result string.
    char *result = (char *)malloc(strlen(value) + 1);
    if (result == NULL)
    {
        return NULL; // Return NULL if memory allocation fails.
    }

    // Copy the string value into the result buffer.
    strcpy(result, value);

    // Return the dynamically allocated string.
    return result;
}

void AddNonPersistentTags(cJSON *msgTags, cJSON *tags, const char **persistentTags, size_t numPersistentTags)
{
    // Iterate over each tag in the source array.
    const cJSON *tag = NULL; // Pointer to the current tag object.
    cJSON_ArrayForEach(tag, msgTags)
    {
        cJSON *tagName = cJSON_GetObjectItemCaseSensitive(tag, "name"); // Extract the tag's name.
        bool isPersistent = false;                                      // Flag to check if the current tag is persistent.

        // Check if the current tag's name matches any of the persistent tags.
        for (size_t j = 0; j < numPersistentTags; j++)
        {
            if (strcmp(tagName->valuestring, persistentTags[j]) == 0)
            {
                isPersistent = true; // Mark as persistent if a match is found.
                break;
            }
        }

        // If the tag is not persistent, add it to the target array.
        if (!isPersistent)
        {
            cJSON_AddItemToArray(tags, cJSON_Duplicate(tag, true)); // Duplicate and add the tag.
        }
    }

    // for (int i = 0; i < cJSON_GetArraySize(msgTags); i++)
    // {
    //     cJSON *tag = cJSON_GetArrayItem(msgTags, i);                    // Get the current tag.
    //     cJSON *tagName = cJSON_GetObjectItemCaseSensitive(tag, "name"); // Extract the tag's name.
    //     bool isPersistent = false;                                      // Flag to check if the current tag is persistent.

    //     // Check if the current tag's name matches any of the persistent tags.
    //     for (size_t j = 0; j < numPersistentTags; j++)
    //     {
    //         if (strcmp(tagName->valuestring, persistentTags[j]) == 0)
    //         {
    //             isPersistent = true; // Mark as persistent if a match is found.
    //             break;
    //         }
    //     }

    //     // If the tag is not persistent, add it to the target array.
    //     if (!isPersistent)
    //     {
    //         cJSON_AddItemToArray(tags, cJSON_Duplicate(tag, true)); // Duplicate and add the tag.
    //     }
    // }
}

void AddNonExcludedTagsAsProperties(cJSON *msgJson, cJSON *tags, const char **excludedTags, size_t numExcludedTags)
{
    // Iterate over each tag in the source array.
    const cJSON *tag = NULL; // Pointer to the current tag object.
    cJSON_ArrayForEach(tag, tags)
    {

        cJSON *tagName = cJSON_GetObjectItemCaseSensitive(tag, "name");   // Extract the tag's name.
        cJSON *tagValue = cJSON_GetObjectItemCaseSensitive(tag, "value"); // Extract the tag's value.

        bool isExcluded = false; // Flag to check if the current tag is excluded.

        // Check if the current tag's name matches any of the excluded tags.
        for (size_t j = 0; j < numExcludedTags; j++)
        {
            if (strcmp(tagName->valuestring, excludedTags[j]) == 0)
            {
                isExcluded = true; // Mark as excluded if a match is found.
                break;
            }
        }
        // If the tag is not excluded, add it as a property to the target cJSON object.
        if (!isExcluded)
        {
            cJSON_AddStringToObject(msgJson, tagName->valuestring, tagValue->valuestring); // Add the tag.
        }
    }

    // for (int i = 0; i < cJSON_GetArraySize(tags); i++)
    // {
    //     cJSON *tag = cJSON_GetArrayItem(tags, i);                         // Get the current tag.
    //     cJSON *tagName = cJSON_GetObjectItemCaseSensitive(tag, "name");   // Extract the tag's name.
    //     cJSON *tagValue = cJSON_GetObjectItemCaseSensitive(tag, "value"); // Extract the tag's value.

    //     bool isExcluded = false; // Flag to check if the current tag is excluded.

    //     // Check if the current tag's name matches any of the excluded tags.
    //     for (size_t j = 0; j < numExcludedTags; j++)
    //     {
    //         if (strcmp(tagName->valuestring, excludedTags[j]) == 0)
    //         {
    //             isExcluded = true; // Mark as excluded if a match is found.
    //             break;
    //         }
    //     }

    //     // If the tag is not excluded, add it as a property to the target cJSON object.
    //     if (!isExcluded)
    //     {
    //         cJSON_AddStringToObject(msgJson, tagName->valuestring, tagValue->valuestring); // Add the tag.
    //     }
    // }
}

void AddStringToJSONIfExists(cJSON *source, cJSON *destination, const char *key)
{
    // Attempt to retrieve the item from the source JSON object using the specified key.
    const cJSON *item = cJSON_GetObjectItemCaseSensitive(source, key);

    // Check if the item exists, is a string, and has a non-null value.
    if (cJSON_IsString(item) && item->valuestring)
    {
        // Add the string to the destination JSON object under the same key.
        cJSON_AddStringToObject(destination, key, item->valuestring);
    }
}

bool IsStringInArray(const char *str, const char **arr, size_t size)
{
    // Iterate over each element in the array.
    for (size_t i = 0; i < size - 1; i++)
    {
        const char *d = arr[i];
        // Compare the current element with the target string.
        if (strcmp(arr[i], str) == 0)
        {
            return true; // Return true if a match is found.
        }
    }

    return false; // Return false if no match is found.
}
