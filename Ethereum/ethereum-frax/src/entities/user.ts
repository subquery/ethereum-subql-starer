import { User } from '../types'
import { getFactory } from './factory'
import {BigNumber} from "ethers";

export async function createUser(address: String): Promise<User> {
  // Update user count on factory
  const factory = await getFactory()

  factory.userCount = BigNumber.from(factory.userCount).add("1").toBigInt();

  await factory.save()

  const user = User.create({
    id: address.toString()
  });

  await user.save()

  return user as User
}

export async function getUser(address: String): Promise<User> {
  let user = await User.get(address.toString())

  // If no user, create one
  if (!user) {
    user = await createUser(address)
  }

  return user as User
}

export async function updateUser(address: String): Promise<User> {
  const user = await getUser(address)

  return user as User
}

export async function updateUsers(addresses: String[]): Promise<void> {
  // log.info('Update users', [])
  for (let i = 0; i < addresses.length; i++) {
    await updateUser(addresses[i])
  }
}
