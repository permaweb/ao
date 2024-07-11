#ifndef AO_H_
#define AO_H_

#include <string>
#include <vector>
#include <iostream>
#include "json.hpp"
using json = nlohmann::json;


#define AO_API static


#ifdef __cplusplus
extern "C" {
#endif


struct AO
{
    // Class Variables
    std::string _version;
    std::string _module;
    unsigned int _ref;

    std::string id;
    json authorities;
    json outbox;
};


// Pad Zero to 32 bit
// This function will pad zero to the left of the number to make it 32 bit
AO_API void ao_padZero32(unsigned int num, std::string &result);

// Print AO Process Data
AO_API void ao_print();

// Initialize AO Process with Environment Data from the Process Object
AO_API void ao_init(std::string env);

// Normalize Message Data to be sent to the Process
// This function will remove unwanted tags from the message
AO_API json ao_normalize(std::string msg);

// Log Message to the Process
// This function will log a message to the process output
AO_API void ao_log(std::string msg);

// Send Message to the Process with the given message
// This function will send a message to the process output
AO_API json ao_send(json msg);

// Spawn a new Process with the given module and message
AO_API json ao_spawn(std::string module, json msg);

// Assign a Process to the given assignment
AO_API void ao_assign(json assignment);

AO_API bool ao_isTrusted(json msg);

AO_API json ao_result(json result);

#ifdef __cplusplus
}
#endif
#endif


AO_API struct AO aoc = {
    "0.0.4",
    "",
    0,
    "",
    {},
    {
        {"Output", {}},
        {"Messages", {}},
        {"Spawns", {}},
        {"Assignments", {}},
        {"Error", nullptr}
    }
};

AO_API void ao_padZero32(unsigned int num, std::string &result)
{
    char buffer[33];
    sprintf(buffer, "%032d", num);
    result = buffer;
}

AO_API void ao_print()
{
    std::cout << "Version: " << aoc._version << std::endl;
    std::cout << "Module: " << aoc._module << std::endl;
    std::cout << "Ref: " << aoc._ref << std::endl;
    std::cout << "Id: " << aoc.id << std::endl;
    std::cout << "Authorities: " << aoc.authorities.dump(4) << std::endl;
    std::cout << "Outbox: " << aoc.outbox.dump(4) << std::endl;
}


AO_API void ao_init(std::string env)
{
    // Json parse env
    json envJson = json::parse(env);
    if (envJson.contains("Process"))
    {
        aoc.id = envJson["Process"]["Id"];
        aoc._module = envJson["Process"]["Owner"];
        aoc.authorities = {};
        for (auto i : envJson["Process"]["Tags"])
        {
            if (i["name"] == "Authority")
            {
                aoc.authorities.push_back(i["value"]);
            }
        }
    }

    aoc.outbox.clear();
}

AO_API json ao_normalize(std::string msg)
{
    const std::vector<std::string> exclude = {
        "Data-Protocol", "Variant", "From-Process",
        "From-Module", "Type", "Ref_", "From",
        "Owner", "Anchor", "Target", "Data", "Tags"};

    // Json parse env
    json msgJson = json::parse(msg);
    for (auto i : msgJson["Tags"])
    {
        bool isPresent = (std::find(exclude.begin(), exclude.end(), i["name"]) != exclude.end());
        if (!isPresent)
        {
            msgJson[i["name"]] = i["value"];
        }
    }

    return msgJson;
}

AO_API void ao_log(std::string msg)
{
    if (aoc.outbox["Output"].is_string())
    {
        aoc.outbox["Output"] = json::parse(aoc.outbox["Output"].get<std::string>());
    }
    aoc.outbox["Output"].push_back(msg);
}

AO_API json ao_send(json msg)
{
    const std::vector<std::string> persitent_tags = {"Target", "Data", "Anchor", "Tags", "From"};
    aoc._ref += 1;
    std::string paddedRef;
    ao_padZero32(aoc._ref, paddedRef);
    json message = {
        {"Target", msg["Target"]},
        {"Data", msg["Data"]},
        {"Anchor", paddedRef},
        {
            "Tags",
            {
                {{"name", "Data-Protocol"}, {"value", "ao"}},
                {{"name", "Variant"}, {"value", "aoc.TN.1"}},
                {{"name", "Type"}, {"value", "Message"}},
                {{"name", "From-Process"}, {"value", aoc.id}},
                {{"name", "From-Module"}, {"value", aoc._module}},
                {{"name", "Ref_"}, {"value", paddedRef}},
            },
        },
    };

    for (json::iterator it = msg.begin(); it != msg.end(); ++it)
    {
        bool isPresent = (std::find(persitent_tags.begin(), persitent_tags.end(), it.key()) != persitent_tags.end());
        if (!isPresent)
        {
            message["Tags"].push_back({{"name", it.key()}, {"value", it.value()}});
        }
    }

    if (msg.contains("Tags"))
    {
        for (auto i : msg["Tags"])
        {
            message["Tags"].push_back(i);
        }
    }

    aoc.outbox["Messages"].push_back(message);

    return message;
}

AO_API json ao_spawn(std::string module, json msg)
{

    const std::vector<std::string> persitent_tags = {"Target", "Data", "Anchor", "Tags", "From"};
    aoc._ref += 1;
    std::string paddedRef;
    ao_padZero32(aoc._ref, paddedRef);
    std::string data = (msg.contains("Data")) ? msg["Data"] : "NODATA";
    json spawn = {
        {"Target", msg["Target"]},
        {"Data", data},
        {"Anchor", paddedRef},
        {
            "Tags",
            {
                {{"name", "Data-Protocol"}, {"value", "ao"}},
                {{"name", "Variant"}, {"value", "aoc.TN.1"}},
                {{"name", "Type"}, {"value", "Process"}},
                {{"name", "From-Process"}, {"value", aoc.id}},
                {{"name", "From-Module"}, {"value", aoc._module}},
                {{"name", "Module"}, {"value", module}},
                {{"name", "Ref_"}, {"value", paddedRef}},
            },
        },
    };

    for (json::iterator it = msg.begin(); it != msg.end(); ++it)
    {
        bool isPresent = (std::find(persitent_tags.begin(), persitent_tags.end(), it.key()) != persitent_tags.end());
        if (!isPresent)
        {
            spawn["Tags"].push_back({{"name", it.key()}, {"value", it.value()}});
        }
    }

    if (msg.contains("Tags"))
    {
        for (auto i : msg["Tags"])
        {
            spawn["Tags"].push_back(i);
        }
    }

    aoc.outbox["Spawns"].push_back(spawn);

    return spawn;
}

AO_API void ao_assign(json assignment)
{
    if (assignment.is_object() &&
        assignment["Processes"].is_object() &&
        assignment["Message"].is_string())
    {
        aoc.outbox["Assignments"].push_back(assignment);
    }
}

AO_API bool ao_isTrusted(json msg)
{
    if (aoc.authorities.size() == 0)
    {
        return true;
    }
    for (auto authority : aoc.authorities)
    {
        if (msg["From"] == authority || msg["Owner"] == authority)
        {
            return true;
        }
    }
    return false;
}

AO_API json ao_result(json result)
{
    json Error = result["Error"];
    if (Error.is_null())
        Error = aoc.outbox["Error"];
    if (!Error.is_null())
        return Error;

    json resultOutput = result["Output"];
    if (resultOutput.is_null())
        resultOutput = aoc.outbox["Output"];
    return {
        {"Output", resultOutput},
        {"Messages", aoc.outbox["Messages"]},
        {"Spawns", aoc.outbox["Spawns"]},
        {"Assignments", aoc.outbox["Assignments"]},
    };
}