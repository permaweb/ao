# Quest aos Process

This Process is a list of ao ecosystem projects open for completion. Anyone running aos can Forge a new Quest or Conclude the Quests they have created. Anyone can List the Quests available for completion.

Quest is an aos Process running the quest.lua program included in this directory. The current Process ID for the Quest Process is - 

```sh
kubffA8LxXV6Q1YRhzM0NbiBFOgbtKdk4QnURMpJDG8
```

# Interacting with Quest

To interact with Quest you must run aos

```sh
npm i -g https://get_ao.g8way.io
```

Once aos is running you can Forge a new Quest, or update your Quest using the below aos command.

```lua
send({ Target = "kubffA8LxXV6Q1YRhzM0NbiBFOgbtKdk4QnURMpJDG8", Tags = { Action = "Forge", Description = "Custom description", Url = "Your Url (not required)", Points = "500", Name = "Custom Quest Name"}})
```

Quests are unique by Name so if you send the same same it will update. If you send a name someone else used it will not let you.

Once a Quest has been completed by someone in the real world, you can Conclude it using the below aos command.

```lua
send({ Target = "kubffA8LxXV6Q1YRhzM0NbiBFOgbtKdk4QnURMpJDG8", Tags = { Action = "Conclude", Name = "Custom Quest Name"}})
```

To List all the available Quests you can send a List Action

```lua
send({ Target = "kubffA8LxXV6Q1YRhzM0NbiBFOgbtKdk4QnURMpJDG8", Tags = { Action = "List" }})
```

Or if you want a JSON response

```lua
send({ Target = "kubffA8LxXV6Q1YRhzM0NbiBFOgbtKdk4QnURMpJDG8", Tags = { Action = "List", Format = "json" }})
```