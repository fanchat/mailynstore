import { Button, Heading } from "@medusajs/ui"
import Link from "next/link"

const Hero = () => {
  return (
    <div className="h-[65vh] w-full border-b border-ui-border-base relative bg-gradient-to-br from-rose-50 via-amber-50 to-stone-50">
      <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-center small:p-32 gap-6">
        <Heading
          level="h1"
          className="text-4xl leading-tight text-ui-fg-base font-light tracking-wide"
        >
          maily&apos;s store
        </Heading>
        <p className="text-lg text-ui-fg-subtle max-w-md leading-relaxed">
          五星品质甄选 · 酒店级家居与童装<br/>
          每一件都经过严苛选品标准
        </p>
        <div className="flex gap-4 mt-4">
          <Link href="/store">
            <Button variant="primary" size="large">
              逛商店
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Hero
