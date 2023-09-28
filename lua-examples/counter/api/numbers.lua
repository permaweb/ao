number = 1
number2 = "1.1"
number3 = 1.1
notnumber = "one"

tnumber = tonumber(number)
tnumber2 = tonumber(number2)
tnumber3 = tonumber(number3)
tnotnumber = tonumber(notnumber)

-- print(tnumber)
-- print(tnumber2)
print(tnumber3)
number3 = 2;
print(number3)
-- print(tnotnumber)

-- print(not tnotnumber)
print("done")

local input = {
  target = "y",
  qty = 3.2
}
print(input.qty)
input.qty = 3;
print(input.qty)
