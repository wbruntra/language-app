#!/usr/bin/env node

const bcrypt = require('bcrypt');

// Salt rounds for bcrypt (10 is a good default)
const saltRounds = 10;

// Get password from command line argument
const password = process.argv[2];

if (!password) {
  console.log('Usage: ./bcrypt-pw.js <password>');
  console.log('Example: ./bcrypt-pw.js mypassword123');
  process.exit(1);
}

// Hash the password
bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    process.exit(1);
  }

  console.log(hash);
});