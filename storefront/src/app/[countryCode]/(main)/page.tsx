import { Metadata } from "next"
import dynamic from "next/dynamic"

const Carousel = dynamic(() => import("@/components/Carousel"), {})

export const metadata: Metadata = {
  title: "maily's store",
  description:
    "maily's store - premium curated goods.",
}

export default async function Home() {
  return (
    <>
      <Carousel />
    </>
  )
}
