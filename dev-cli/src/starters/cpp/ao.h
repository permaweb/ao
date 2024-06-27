#ifndef AO_H
#define AO_H

#include <string>
#include <vector>
#include <iostream>
#include "json.hpp"
using json = nlohmann::json;

class AO
{
public:
    // Class Variables
    std::string _version;
    std::string _module;
    unsigned int _ref;

    std::string id;
    json authorities;
    json outbox;

public:
    AO()
    {
        this->_version = "0.0.4";
        this->_module = "";
        this->_ref = 0;
        this->id = "";
        this->authorities = {};

        this->outbox = {
            {"Output", {}},
            {"Messages", {}},
            {"Spawns", {}},
            {"Assignments", {}},
            {"Error", nullptr}};
    }
    ~AO() {}

    /* Helper Functions */

    // Pad Zero to 32 bit
    // This function will pad zero to the left of the number to make it 32 bit
    void padZero32(int num, std::string &result)
    {
        char buffer[33];
        sprintf(buffer, "%032d", num);
        result = buffer;
    }

    // Print AO Process Data
    void print()
    {
        std::cout << "Version: " << this->_version << std::endl;
        std::cout << "Module: " << this->_module << std::endl;
        std::cout << "Ref: " << this->_ref << std::endl;
        std::cout << "Id: " << this->id << std::endl;
        std::cout << "Authorities: " << this->authorities.dump(4) << std::endl;
        std::cout << "Outbox: " << this->outbox.dump(4) << std::endl;
    }

    /* Core Functions */

    // Initialize AO Process with Environment Data from the Process Object
    void init(std::string env)
    {
        // Json parse env
        json envJson = json::parse(env);
        if (envJson.contains("Process"))
        {
            this->id = envJson["Process"]["Id"];
            this->_module = envJson["Process"]["Owner"];
            this->authorities = {};
            for (auto i : envJson["Process"]["Tags"])
            {
                if (i["name"] == "Authority")
                {
                    this->authorities.push_back(i["value"]);
                }
            }
        }

        this->outbox.clear();
    }

    // Normalize Message Data to be sent to the Process
    // This function will remove unwanted tags from the message
    json normalize(std::string msg)
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

    // Log Message to the Process
    // This function will log a message to the process output
    void log(std::string msg)
    {
        if (this->outbox["Output"].is_string())
        {
            this->outbox["Output"] = json::parse(this->outbox["Output"].get<std::string>());
        }
        this->outbox["Output"].push_back(msg);
    }

    // Send Message to the Process with the given message
    // This function will send a message to the process output
    json send(json msg)
    {
        const std::vector<std::string> persitent_tags = {"Target", "Data", "Anchor", "Tags", "From"};
        this->_ref += 1;
        std::string paddedRef;
        padZero32(this->_ref, paddedRef);
        json message = {
            {"Target", msg["Target"]},
            {"Data", msg["Data"]},
            {"Anchor", paddedRef},
            {
                "Tags",
                {
                    {{"name", "Data-Protocol"}, {"value", "ao"}},
                    {{"name", "Variant"}, {"value", "ao.TN.1"}},
                    {{"name", "Type"}, {"value", "Message"}},
                    {{"name", "From-Process"}, {"value", this->id}},
                    {{"name", "From-Module"}, {"value", this->_module}},
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

        this->outbox["Messages"].push_back(message);

        return message;
    }

    // Spawn a new Process with the given module and message
    json spawn(std::string module, json msg)
    {
        // std::cout << module;
        // return {};
        const std::vector<std::string> persitent_tags = {"Target", "Data", "Anchor", "Tags", "From"};
        this->_ref += 1;
        std::string paddedRef;
        padZero32(this->_ref, paddedRef);
        std::string data = (msg.contains("Data")) ? msg["Data"] : "NODATA";
        json spawn = {
            {"Target", msg["Target"]},
            {"Data", data},
            {"Anchor", paddedRef},
            {
                "Tags",
                {
                    {{"name", "Data-Protocol"}, {"value", "ao"}},
                    {{"name", "Variant"}, {"value", "ao.TN.1"}},
                    {{"name", "Type"}, {"value", "Process"}},
                    {{"name", "From-Process"}, {"value", this->id}},
                    {{"name", "From-Module"}, {"value", this->_module}},
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

        this->outbox["Spawns"].push_back(spawn);

        return spawn;
    }

    // Assign a Process to the given assignment
    void assign(json assignment)
    {
        if (assignment.is_object() &&
            assignment["Processes"].is_object() &&
            assignment["Message"].is_string())
        {
            this->outbox["Assignments"].push_back(assignment);
        }
    }

    bool isTrusted(json msg)
    {
        if (authorities.size() == 0)
        {
            return true;
        }
        for (auto authority : authorities)
        {
            if (msg["From"] == authority || msg["Owner"] == authority)
            {
                return true;
            }
        }
        return false;
    }

    json result(json result)
    {
        json Error = result["Error"];
        if (Error.is_null())
            Error = outbox["Error"];
        if (!Error.is_null())
            return Error;

        json resultOutput = result["Output"];
        if (resultOutput.is_null())
            resultOutput = this->outbox["Output"];
        return {
            {"Output", resultOutput},
            {"Messages", this->outbox["Messages"]},
            {"Spawns", this->outbox["Spawns"]},
            {"Assignments", this->outbox["Assignments"]},
        };
    }
};

// int main()
// {
//     std::string ENV = R"({"Process": {"Id": "AOS","Owner": "FOOBAR", "Tags": [{"name": "Authority", "value": "asdasdasda1231"}, {"name": "Authority", "value": "1231234asd"}]}})";
//     std::string MSG = R"({"Target" : "AOS","Owner" : "Peter","Block-Height" : "1000", "Id" : "1234xyxfoo","Module" : "WOOPAWOOPA","Tags" : [ {"name" : "Action", "value" : "Pete"} ],"Data" : "Hello"})";

//     AO ao;

//     std::cout << "######## Init AO ########" << std::endl;
//     ao.init(ENV);
//     ao.print();

//     std::cout << "######## Normalize Message ########" << std::endl;
//     json norm = ao.normalize(MSG);
//     std::cout << norm.dump(4) << std::endl;

//     std::cout << "######## Send Message ########" << std::endl;
//     json send = ao.send(norm);
//     std::cout << send.dump(4) << std::endl;

//     std::cout << "######## Spawn Process ########" << std::endl;
//     json spawn = ao.spawn("Module", norm);
//     std::cout << spawn.dump(4) << std::endl;

//     std::cout << "######## Assign Process ########" << std::endl;
//     json assign = {
//         {"Processes", {"Process1", "Process2"}},
//         {"Message", "Hello World"}};
//     ao.assign(assign);

//     std::cout << "######## Result ########" << std::endl;
//     json result = ao.result({});
//     std::cout << result.dump(4) << std::endl;
// }

#endif
