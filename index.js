require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.urlencoded({ extended: true }));

const mooseJokes = [
  "Alla barnen kunde läsa och sådär, utom Casper - han var fett sär",
  "Alla barnen fick diplom och applåd, utom Casper – han sniffa lim och dog efter ett våldsdåd",
  "Alla barnen gick till skolan med skor, utom Casper – han åt blyerts och dog av klor.",
  "Alla barnen gick på festen med stil, utom Casper – han kom som nekrofil.",
  "Alla barnen överlevde sin far, utom Casper – han blev bara tänjbar.",
  "Alla barnen flydde från brottsplats med fart, utom Casper – han stod kvar och var 'smart'",
  "Alla barnen sa nej till heroin, utom Casper – han sa 'fan va' fin!",
  "Alla barnen undvek Hassar, utom Casper - han hamnade i Icakassar.",
  "Alla barnen lekte fint med Greger, utom Casper - han betedde sig som en neger.",
  "Alla barnen förstod att katten ville bli klappad, utom Casper - han var förståndshandikappad.'"
];

app.post('/slack/commands', (req, res) => {
  console.log('🎯 /moose hit!');
  console.log('Slash command body:', req.body);

  const text = (req.body.text || '').trim().toLowerCase();

  if (text === '' || text === 'joke') {
    const joke = mooseJokes[Math.floor(Math.random() * mooseJokes.length)];
    return res.send(joke);
  }

  res.send(`🦌 MooseBot doesn't know what to do with "${text}". Try \`/moose joke\``);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🟢 MooseBot (no Bolt) listening on port ${port}`);
});
