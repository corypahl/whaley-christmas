export type Person = { name: string; slug: string; generation: 1 | 2 | 3 };

export const people: Person[] = [
  { name: "Nana", slug: "nana", generation: 1 },
  { name: "Papa", slug: "papa", generation: 1 },
  { name: "Peter & Brittany", slug: "peter-and-brittany", generation: 2 },
  { name: "Elizabeth", slug: "elizabeth", generation: 2 },
  { name: "Cory", slug: "cory", generation: 2 },
  { name: "Maggie", slug: "maggie", generation: 2 },
  { name: "Hawken", slug: "hawken", generation: 2 },
  { name: "Eddie", slug: "eddie", generation: 2 },
  { name: "Sally", slug: "sally", generation: 2 },
  { name: "Theresa", slug: "theresa", generation: 2 },
  { name: "Paul & Brooke", slug: "paul-and-brooke", generation: 2 },
  { name: "Richie", slug: "richie", generation: 2 },
  { name: "Tommy", slug: "tommy", generation: 2 },
  { name: "Emma", slug: "emma", generation: 3 },
  { name: "John Paul", slug: "john-paul", generation: 3 },
  { name: "Sophie", slug: "sophie", generation: 3 },
  { name: "Zelie", slug: "zelie", generation: 3 },
  { name: "Adam", slug: "adam", generation: 3 },
  { name: "Nellie", slug: "nellie", generation: 3 },
  { name: "Kolbe", slug: "kolbe", generation: 3 },
  { name: "Frankie", slug: "frankie", generation: 3 },
  { name: "Jude", slug: "jude", generation: 3 },
];

export const personBySlug = new Map(people.map((person) => [person.slug, person]));
