import { Metadata } from "next"

import Hero from "@modules/home/components/hero"

export const metadata: Metadata = {
  title: "maily's store",
  description:
    "maily's store - premium curated goods.",
}

export default async function Home() {
  return <Hero />
}
