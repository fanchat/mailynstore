import { Metadata } from "next"
import dynamic from "next/dynamic"

const Carousel = dynamic(() => import("@/components/Carousel"), { ssr: false })

import Hero from "@modules/home/components/hero"

export const metadata: Metadata = {
  title: "maily's store",
  description:
    "maily's store - premium curated goods.",
}

export default async function Home() {
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Carousel />
      </div>
      <Hero />
    </>
  )
}
