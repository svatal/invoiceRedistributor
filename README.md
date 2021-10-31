# O2 invoice redistributor

## What does it do

If you have good mobile contract and offer your employees to use it, you may have troubles to redistribute the bill. The mobile provider gets down to particular phone numbers but you have to assign correct employee, sum all of his/hers numbers and so on. Every month. This should ease some of the regular burden.

## How to use it

- create phone groups in `data/customers.json`

```
{
    "groupName1": {
        "vs": number, // variable symbol, userId or something
        "numbers": [
            555123456,
            555123457
        ]
    },
    "groupName2": ...
}
```

- download both invoice pdf (`/.*-fs.pdf/`) and the invoice xml detail (`/.*-s.xml/`)
- put the downloaded files into data folder
- run the program
- .. and you will get reordered invoice by groups with summaries
- if you want the sum of all groups to match the invoice price (there is a rounding error in the invoice breakdown to phone numbers that can add up), just add phone number `0` to one of the groups (or a new one). It will carry the rounding error, so the sum should match.
