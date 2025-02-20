import { scrypt } from '@noble/hashes/scrypt'
import { randomBytes, bytesToHex } from '@noble/hashes/utils'

const options = { N: 2 ** 18, r: 8, p: 1, dkLen: 32 }

export const hashPassword = (password: string) => {
  const salt = bytesToHex(randomBytes(32))
  const hash = scrypt(password, salt, options)
  return `${salt}:${bytesToHex(hash)}`
}

export const verifyPassword = async (password: string, hash: string) => {
  const [salt, key] = hash.split(':')
  const derivedKey = scrypt(password, salt, options)
  return key === bytesToHex(derivedKey)
}
