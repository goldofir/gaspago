// Gera um hash bcrypt para usar em ADMIN_PASSWORD_HASH.
// Uso: node scripts/hash-password.js "sua-senha-aqui"
const bcrypt = require('bcryptjs')

const password = process.argv[2]

if (!password) {
  console.error('Uso: node scripts/hash-password.js "sua-senha-aqui"')
  process.exit(1)
}

const hash = bcrypt.hashSync(password, 10)
console.log(hash)
