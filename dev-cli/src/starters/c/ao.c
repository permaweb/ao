#include "ao.h"

// Constants for tag filtering and processing.
const char *nonExtractableTags[] = {
    "Data-Protocol", "Variant", "From-Process", "From-Module", "Type",
    "From", "Owner", "Anchor", "Target", "Data", "Tags"};
const size_t numNonExtractableTags = sizeof(nonExtractableTags) / sizeof(nonExtractableTags[0]);

const char *nonForwardableTags[] = {
    "Data-Protocol", "Variant", "From-Process", "From-Module", "Type",
    "From", "Owner", "Anchor", "Target", "Tags",
    "TagArray", "Hash-Chain", "Timestamp", "Nonce", "Epoch", "Signature",
    "Forwarded-By", "Pushed-For", "Read-Only", "Cron", "Block-Height",
    "Reference", "Id", "Reply-To"};
const size_t numNonForwardableTags = sizeof(nonExtractableTags) / sizeof(nonExtractableTags[0]);

const char *persistentTags[] = {"Target", "Data", "Anchor", "Tags", "From"};
const size_t numPersistentTags = sizeof(persistentTags) / sizeof(persistentTags[0]);

struct ao ao = {
    ._version = "0.0.4",
    ._module = NULL,
    ._ref = 0,
    .id = NULL,
    .authorities = NULL,
    .outbox = NULL,

};

void ao_init(const char *env)
{
    // Parse the environment JSON string into a cJSON object
    cJSON *envJson = cJSON_Parse(env);

    // Retrieve the "Process" object from the parsed JSON
    cJSON *process = cJSON_GetObjectItemCaseSensitive(envJson, "Process");

    // Check if the "Process" object is not NULL
    if (process != NULL)
    {
        // If ao.id is NULL, retrieve and assign the "Id" from "Process"
        if (ao.id == NULL)
        {
            ao.id = GetStringFromJSON(process, "Id");
        }
        // Initialize a cJSON pointer for iterating through tags
        cJSON *tag = NULL;
        // Retrieve the "Tags" array from the "Process" object
        cJSON *tags = cJSON_GetObjectItemCaseSensitive(process, "Tags");

        // If ao._module is NULL, search for the "Module" tag within "Tags"
        if (ao._module == NULL)
        {
            if (tags != NULL)
            {
                cJSON_ArrayForEach(tag, tags)
                {
                    if (strcmp(cJSON_GetObjectItemCaseSensitive(tag, "name")->valuestring, "Module") == 0)
                    {
                        ao._module = GetStringFromJSON(tag, "value");
                        break; // Exit loop once the "Module" tag is found and assigned
                    }
                }
            }
        }
        // If ao.authorities is NULL, initialize it as a cJSON array
        if (ao.authorities == NULL)
        {
            ao.authorities = cJSON_CreateArray();
            if (tags != NULL)
            {
                // Iterate through "Tags" to find and add "Authority" tags to ao.authorities
                cJSON_ArrayForEach(tag, tags)
                {
                    if (strcmp(cJSON_GetObjectItemCaseSensitive(tag, "name")->valuestring, "Authority") == 0)
                    {
                        cJSON_AddItemToArray(ao.authorities, cJSON_Duplicate(cJSON_GetObjectItemCaseSensitive(tag, "value"), true));
                    }
                }
            }
        }
    }

    // Delete the envJson object to free memory
    cJSON_Delete(envJson);
    // Clear the outbox after processing the environment JSON
    ao_clearOutbox();
}

char *ao_normalize(const char *msg)
{
    cJSON *msgJson = cJSON_Parse(msg);                               // Parse the input JSON string into a cJSON object.
    cJSON *tags = cJSON_GetObjectItemCaseSensitive(msgJson, "Tags"); // Extract the "Tags" array from the JSON object.

    // Add tags to the root JSON object, excluding the specified tags.
    AddNonExcludedTagsAsProperties(msgJson, tags, nonExtractableTags, numNonExtractableTags);

    char *msgStr = cJSON_Print(msgJson); // Convert the modified JSON object back into a string.

    cJSON_Delete(msgJson); // Clean up the cJSON object to prevent memory leaks.
    return msgStr;         // Return the normalized JSON string.
}

char *ao_sanitize(const char *msg)
{
    cJSON *msgJson = cJSON_Parse(msg);        // Parse the input JSON string into a cJSON object.
    cJSON *newMessage = cJSON_CreateObject(); // Create a new cJSON object to hold the sanitized message.
    // Iterate over each key in the JSON object.
    cJSON *child = NULL;
    cJSON_ArrayForEach(child, msgJson)
    {
        const char *d = child->string;
        // Check if the current key is in the list of non-forwardable tags.
        if (!IsStringInArray(child->string, nonForwardableTags, numNonForwardableTags))
        {
            cJSON_AddItemToObject(newMessage, child->string, cJSON_Duplicate(child, true));
        }
    }

    char *msgStr = cJSON_Print(newMessage); // Convert the modified JSON object back into a string.

    cJSON_Delete(msgJson);    // Clean up the cJSON object to prevent memory leaks.
    cJSON_Delete(newMessage); // Clean up the cJSON object to prevent memory leaks.
    return msgStr;            // Return the sanitized JSON string.
}

void ao_log(const char *msg)
{
    // Retrieve the "Output" item from the outbox, expecting it to be a string or an array.
    cJSON *output = cJSON_GetObjectItemCaseSensitive(ao.outbox, "Output");

    // If the "Output" item is a string, parse it into a JSON object to replace the existing string.
    if (cJSON_IsString(output))
    {
        cJSON_ReplaceItemInObject(ao.outbox, "Output", cJSON_Parse(output->valuestring));
        // Update the output reference to the newly parsed object.
        output = cJSON_GetObjectItemCaseSensitive(ao.outbox, "Output");
    }

    // Add the new log message as a string to the "Output" array.
    cJSON_AddItemToArray(output, cJSON_CreateString(msg));

    // Replace the "Output" item in the outbox with the updated array (redundant if output was initially an array).
    cJSON_ReplaceItemInObject(ao.outbox, "Output", output);
}

char *ao_send(const char *msg)
{
    // Parse the incoming message from a JSON string to a cJSON object.
    cJSON *msgJson = cJSON_Parse(msg);

    // Increment the reference counter for messages.
    ao._ref += 1;

    // Pad the reference number to ensure it has a consistent format.
    char *paddedRef = PadZero32(ao._ref);

    // Create a new cJSON object to construct the outgoing message.
    cJSON *message = cJSON_CreateObject();

    // Add specific fields from the incoming message to the outgoing message if they exist.
    AddStringToJSONIfExists(msgJson, message, "Target");
    AddStringToJSONIfExists(msgJson, message, "Data");
    AddStringToJSONIfExists(msgJson, message, "Anchor");

    // Create a new "Tags" array and add it to the message object
    cJSON *tags = cJSON_CreateArray();
    cJSON_AddItemToObject(message, "Tags", tags);

    // Add predefined tags to the "Tags" array
    AddTagToArray(tags, "Data-Protocol", "ao");
    AddTagToArray(tags, "Variant", "aoc.TN.1");
    AddTagToArray(tags, "Type", "Message");
    AddTagToArray(tags, "Reference", paddedRef);

    // Iterate over all items in msgJson, excluding persistent tags and the "Tags" tag itself
    const cJSON *child = NULL;
    cJSON_ArrayForEach(child, msgJson)
    {
        if (!IsStringInArray(child->string, persistentTags, numPersistentTags) && strcmp(child->string, "Tags") != 0)
        {
            // Add each non-excluded tag to the "Tags" array
            AddTagToArray(tags, child->string, cJSON_GetStringValue(child));
        }
    }

    // Check if the original message JSON has a "Tags" array
    if (cJSON_HasObjectItem(msgJson, "Tags"))
    {
        cJSON *tags = cJSON_GetObjectItemCaseSensitive(msgJson, "Tags");
        cJSON_ArrayForEach(child, tags)
        {
            // Initialize found flag for each tag
            bool found = false;
            cJSON *tag = NULL;
            cJSON *newTags = cJSON_GetObjectItemCaseSensitive(message, "Tags");
            if (cJSON_IsArray(tags))
                AddTagToArray(newTags, cJSON_GetStringValue(cJSON_GetObjectItemCaseSensitive(child, "name")), cJSON_GetStringValue(cJSON_GetObjectItemCaseSensitive(child, "value")));
            else
                AddTagToArray(newTags, child->string, cJSON_GetStringValue(child));
        }
    }

    // Add the constructed outgoing message to the outbox.
    cJSON *messages = cJSON_GetObjectItemCaseSensitive(ao.outbox, "Messages");
    cJSON_AddItemToArray(messages, cJSON_Duplicate(message, true));
    cJSON_ReplaceItemInObject(ao.outbox, "Messages", messages);

    // Convert the outgoing message cJSON object to a string.
    char *msgStr = cJSON_Print(message);

    // Free allocated resources.
    free(paddedRef);
    cJSON_Delete(message);
    cJSON_Delete(msgJson);

    // Return the string representation of the processed message.
    return msgStr;
}

char *ao_spawn(const char *module, const char *msg)
{
    // Parse the incoming message from a JSON string to a cJSON object.
    cJSON *msgJson = cJSON_Parse(msg);

    // Increment the reference counter for messages.
    ao._ref += 1;

    // Pad the reference number to ensure it has a consistent format.
    char *paddedRef = PadZero32(ao._ref);

    // Create a new cJSON object to construct the spawn message.
    cJSON *spawn = cJSON_CreateObject();

    // Add specific fields from the incoming message to the spawn message if they exist.
    AddStringToJSONIfExists(msgJson, spawn, "Target");
    AddStringToJSONIfExists(msgJson, spawn, "Data");
    AddStringToJSONIfExists(msgJson, spawn, "Anchor");

    // Create a cJSON array for tags and add it to the spawn message.
    cJSON *tags = cJSON_CreateArray();
    cJSON_AddItemToObject(spawn, "Tags", tags);

    // Add predefined and relevant tags to the tags array.
    AddTagToArray(tags, "Data-Protocol", "ao");
    AddTagToArray(tags, "Variant", "aoc.TN.1");
    AddTagToArray(tags, "Type", "Process");
    AddTagToArray(tags, "From-Process", ao.id);
    AddTagToArray(tags, "From-Module", ao._module);
    AddTagToArray(tags, "Module", module);
    AddTagToArray(tags, "Ref_", paddedRef);

    // Filter and add non-persistent tags from the incoming message to the spawn message.
    cJSON *msgTags = cJSON_GetObjectItemCaseSensitive(msgJson, "Tags");
    AddNonPersistentTags(msgTags, tags, persistentTags, numPersistentTags);

    // Add the constructed spawn message to the outbox.
    cJSON *spawns = cJSON_GetObjectItemCaseSensitive(ao.outbox, "Spawns");
    cJSON_AddItemToArray(spawns, cJSON_Duplicate(spawn, true));
    cJSON_ReplaceItemInObject(ao.outbox, "Spawns", spawns);

    // Convert the spawn message cJSON object to a string.
    char *msgStr = cJSON_Print(spawn);

    // Free allocated resources.
    free(paddedRef);
    cJSON_Delete(spawn);
    cJSON_Delete(msgJson);

    // Return the string representation of the spawn message.
    return msgStr;
}

void ao_assign(const char *assignment)
{
    // Parse the incoming assignment JSON string into a cJSON object.
    cJSON *assignmentJson = cJSON_Parse(assignment);

    // Extract the "Processes" and "Message" items from the parsed assignment JSON.
    cJSON *processes = cJSON_GetObjectItemCaseSensitive(assignmentJson, "Processes");
    cJSON *message = cJSON_GetObjectItemCaseSensitive(assignmentJson, "Message");

    // Retrieve the "Assignments" array from the outbox.
    cJSON *assignments = cJSON_GetObjectItemCaseSensitive(ao.outbox, "Assignments");

    // Add the parsed assignment JSON object to the "Assignments" array.
    cJSON_AddItemToArray(assignments, assignmentJson);

    // Replace the "Assignments" item in the outbox with the updated array.
    // Note: This step might be redundant if the cJSON library automatically updates the parent object.
    cJSON_ReplaceItemInObject(ao.outbox, "Assignments", assignments);
}

bool ao_isTrusted(const char *msg)
{
    // Parse the incoming message JSON string into a cJSON object.
    cJSON *msgJson = cJSON_Parse(msg);

    // If there are no authorities defined, consider all messages as trusted.
    if (cJSON_GetArraySize(ao.authorities) == 0)
    {
        return true;
    }

    // Iterate through the list of trusted authorities.
    for (int i = 0; i < cJSON_GetArraySize(ao.authorities); i++)
    {
        // Retrieve the current authority from the list.
        cJSON *authority = cJSON_GetArrayItem(ao.authorities, i);

        // Check if the "From" or "Owner" field in the message matches the current authority.
        if (strcmp(cJSON_GetStringValue(cJSON_GetObjectItemCaseSensitive(msgJson, "From")), cJSON_GetStringValue(authority)) == 0 ||
            strcmp(cJSON_GetStringValue(cJSON_GetObjectItemCaseSensitive(msgJson, "Owner")), cJSON_GetStringValue(authority)) == 0)
        {
            // If a match is found, the message is from a trusted authority.
            return true;
        }
    }

    // If no matches are found, the message is not from a trusted authority.
    return false;
}

char *ao_result(const char *result)
{
    char *response = NULL;

    // Parse the result string into a cJSON object for manipulation
    cJSON *resultJson = cJSON_Parse(result);

    // Attempt to retrieve an "Error" object from the result JSON
    cJSON *Error = cJSON_GetObjectItemCaseSensitive(resultJson, "Error");
    // If the result JSON does not have an "Error", check the outbox for one
    if (Error == NULL)
    {
        Error = cJSON_GetObjectItemCaseSensitive(ao.outbox, "Error");
    }
    // If there is an error, convert it to a string to be returned
    if (!cJSON_IsNull(Error))
    {
        response = cJSON_Print(Error);
    }
    else // If there is no error, construct the final result JSON object
    {
        // Attempt to retrieve the "Output" object from the result JSON, fallback to outbox if not present
        cJSON *resultOutput = cJSON_GetObjectItemCaseSensitive(resultJson, "Output");
        if (resultOutput == NULL)
            resultOutput = cJSON_GetObjectItemCaseSensitive(ao.outbox, "Output");

        // Create a new JSON object to hold the final result
        cJSON *resultJsonOut = cJSON_CreateObject();
        // Add the "Output" object, duplicating it to ensure no modifications to the original
        cJSON_AddItemToObject(resultJsonOut, "Output", cJSON_Duplicate(resultOutput, true));
        // Add the "Messages", "Spawns", and "Assignments" arrays from the outbox to the final result
        cJSON_AddItemToObject(resultJsonOut, "Messages", cJSON_Duplicate(cJSON_GetObjectItemCaseSensitive(ao.outbox, "Messages"), true));
        cJSON_AddItemToObject(resultJsonOut, "Spawns", cJSON_Duplicate(cJSON_GetObjectItemCaseSensitive(ao.outbox, "Spawns"), true));
        cJSON_AddItemToObject(resultJsonOut, "Assignments", cJSON_Duplicate(cJSON_GetObjectItemCaseSensitive(ao.outbox, "Assignments"), true));

        // Convert the final result JSON object to a string to be returned
        response = cJSON_Print(resultJsonOut);
        // Clean up the final result JSON object to free memory
        cJSON_Delete(resultJsonOut);
    }

    // Clean up the parsed result JSON object to free memory
    cJSON_Delete(resultJson);
    return response;
}

void ao_print()
{
    char *authorities_str = cJSON_Print(ao.authorities);
    char *outbox_str = cJSON_Print(ao.outbox);
    printf("Version: %s\n", ao._version);
    printf("Module: %s\n", ao._module);
    printf("Ref: %d\n", ao._ref);
    printf("Id: %s\n", ao.id);
    printf("Authorities: %s\n", authorities_str);
    printf("Outbox: %s\n", outbox_str);
    free(authorities_str);
    free(outbox_str);
}

void ao_clearOutbox()
{
    cJSON_Delete(ao.outbox);
    ao.outbox = cJSON_CreateObject();
    cJSON_AddArrayToObject(ao.outbox, "Output");
    cJSON_AddArrayToObject(ao.outbox, "Messages");
    cJSON_AddArrayToObject(ao.outbox, "Spawns");
    cJSON_AddArrayToObject(ao.outbox, "Assignments");
    cJSON_AddNullToObject(ao.outbox, "Error");
}

void ao_delete()
{
    // Check if the outbox cJSON object exists and delete it to free its memory.
    if (ao.outbox)
        cJSON_Delete(ao.outbox);

    // Check if the authorities cJSON object exists and delete it to free its memory.
    if (ao.authorities)
        cJSON_Delete(ao.authorities);

    // Check if the id string has been allocated and free its memory.
    if (ao.id)
        free(ao.id);

    // Check if the _module string has been allocated and free its memory.
    if (ao._module)
        free(ao._module);
}
