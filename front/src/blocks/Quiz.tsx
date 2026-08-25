import { useState } from 'react'
import type { Block } from '../types'
import { asset } from '../assets'
import { Rich } from './Rich'

function Check() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-white">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export function Quiz({ block, onAnswer }: { block: Block; onAnswer: (optionId: string, label: string) => void }) {
  const d = block.data
  const options: any[] = d.content ?? []
  const isImage = d.model === 'image'
  const showCheckbox = d.checkbox?.show
  const [picked, setPicked] = useState<string | null>(null)

  const choose = (opt: any) => {
    if (picked) return
    setPicked(opt.id)
    const label = (opt.text?.content ?? '').replace(/<[^>]+>/g, '').trim()
    setTimeout(() => onAnswer(opt.id, label), 300)
  }

  return (
    <div id={block.id} className={`grid flex-auto gap-2.5 ${isImage ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {options.map((opt) => {
        const selected = picked === opt.id
        return (
          <button key={opt.id} type="button" className="cursor-pointer" onClick={() => choose(opt)}>
            <div
              id={opt.id}
              className={`flex flex-auto w-full max-w-full text-pretty gap-2 border rounded-xl p-4 mx-auto shadow-lg fadeIn text-inherit bg-inherit border-inherit shadow-gray-600/5 overflow-hidden transition-all hover:scale-[1.025] active:scale-[0.97] ${isImage ? 'flex-row-reverse' : 'flex-row'}`}
              style={{ animationName: 'none', backgroundColor: d.container?.backgroundColor ?? '#ffffff' }}
            >
              {showCheckbox && (
                <div className="flex flex-none justify-center items-center border-inherit">
                  <div
                    className="flex size-7 h-auto border-2 rounded-full aspect-square justify-center items-center transition-all duration-50 relative overflow-hidden !bg-white"
                    style={{ width: d.checkbox?.width ?? '20px', borderWidth: d.checkbox?.borderWidth ?? '3px', borderRadius: d.checkbox?.borderRadius ?? '14px' }}
                  >
                    <div
                      className="flex justify-center items-center -inset-2 absolute transition-all duration-50 text-white"
                      style={{ backgroundColor: selected ? '#22c55e' : '#ffffff', opacity: selected ? 1 : 0 }}
                    >
                      <Check />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex flex-auto gap-4 flex-col items-center text-center">
                {isImage && opt.image?.show && (
                  <img
                    alt=""
                    width={opt.image?.width}
                    height={opt.image?.height}
                    src={asset(opt.image?.uuid)}
                    className="flex-none w-full h-auto"
                    style={{ color: 'transparent', maxWidth: '128px' }}
                  />
                )}
                <Rich className="w-full text-pretty leading-none prose" html={opt.text?.content} style={{ fontSize: d.text?.fontSize ?? '15px' }} />
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
