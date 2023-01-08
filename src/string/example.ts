import fulfill from './fulfill'
import { entityify } from './entityify';


const example = fulfill(
    "{greeting}, {my.place:upper}! :{",
    {
        greeting: "Hello",
        my: {
            fabulous: "Unicorn",
            insect: "Butterfly",
            place: "World"
        },
        phenomenon: "Rainbow"
    },
    {
        upper: function upper(string: string) {
            return string.toUpperCase();
        },
        "": function identity(string: string) {
            return string;
        }
    }
)

const template: string = "<p>Lucky {name.first} {name.last} won ${amount}.</p>";
const person = {
    first: "Da5id",
    last: "<script src=https://enemy.evil/pwn.js/>"
}

// 
const example2 = fulfill(
    template,
    {
        name: person,
        amount: 10
    },
    entityify
)


console.log(example)
console.log(example2)