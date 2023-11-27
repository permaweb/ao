# reading the inbox

<!-- toc -->

- [Connect to AOS](#connect-to-aos)
- [Run `inbox`](#run-inbox)
- [Send Yourself a Message](#send-yourself-a-message)
- [Run `list()`](#run-list)

<!-- tocstop -->

## Connect to AOS 

```zsh
npx @permaweb/aos-cli <path/to/wallet.json>
```

## Run `inbox`

```zsh
aos> inbox
```

## Send Yourself a Message

```zsh
aos> return send("<your proces id>", "say hello")
```

Run `inbox` again to see the message.

## Run `list()`

```zsh
aos> list()
```

You should see something like this!

```
1: 
 Forwarded-For: 8wWPlmh7kog13SC62qapbz8xy9sOdQeYR3iGU_32fSw
 owner: z1pq2WzmaYnfDwvEFgUZBj48anUsxxN64ZjbWOsIn08
 from: 8wWPlmh7kog13SC62qapbz8xy9sOdQeYR3iGU_32fSw
 data: MzMxOA
 tags: 
  1: 
   name: Data-Protocol
   value: ao
  2: 
   name: ao-type
   value: message
  3: 
   name: Forwarded-For
   value: 8wWPlmh7kog13SC62qapbz8xy9sOdQeYR3iGU_32fSw
  4: 
   name: body
   value: say hello
  5: 
   name: Data-Protocol
   value: ao
  6: 
   name: ao-type
   value: message
  7: 
   name: SDK
   value: ao
  8: 
   name: Data-Protocol
   value: ao
  9: 
   name: ao-type
   value: message
  10: 
   name: SDK
   value: ao
 id: FhCw7uRYpbafwVGYxGxINKHgl62hdjgNlt9eymiPfWc
 target: 8wWPlmh7kog13SC62qapbz8xy9sOdQeYR3iGU_32fSw
 Forwarded-By: z1pq2WzmaYnfDwvEFgUZBj48anUsxxN64ZjbWOsIn08
```
