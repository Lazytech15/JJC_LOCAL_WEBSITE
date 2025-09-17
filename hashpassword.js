// hashPassword.js
import bcrypt from 'bcrypt';

const password = 'JDBZUFZVXW';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) {
        console.error('Error hashing password:', err);
        return;
    }
    console.log('Hashed password:', hash);
});
