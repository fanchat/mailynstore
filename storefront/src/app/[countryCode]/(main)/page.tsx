import { Metadata } from "next"
import dynamic from "next/dynamic"

const Carousel = dynamic(() => import("@/components/Carousel"), {})
const BottomBand = dynamic(() => import("@/components/BottomBand"), {})

export const metadata: Metadata = {
  title: "maily's store",
  description:
    "maily's store - premium curated goods.",
}

export default async function Home() {
  return (
    <div className="-mb-16 overflow-hidden flex flex-col h-[calc(100dvh-138px)]">
      {/* Carousel - fills remaining space */}
      <div className="flex-1 overflow-hidden min-h-0">
        <Carousel />
      </div>

      {/* Bottom band - 215px, fixed height, cannot be squeezed */}
      <BottomBand />
    </div>
  )
}
