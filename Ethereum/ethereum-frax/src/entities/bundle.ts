import { Bundle } from '../types'
import {BigNumber} from "ethers";
export async function getBundle(): Promise<Bundle> {
  let bundle = await Bundle.get('1');

  if (bundle === null) {
    bundle = Bundle.create({
      ethPrice: 0, id: "1"
    })
    await bundle.save()
  }

  return bundle as Bundle
}
