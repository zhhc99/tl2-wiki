import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectControlProps {
  label: string
  value: string | number
  options: SelectOption[]
  onChange: (value: string) => void
  className?: string
  icon?: ReactNode
}

export function SelectControl({label,value,options,onChange,className='',icon}:SelectControlProps){
  const rootRef=useRef<HTMLDivElement>(null)
  const triggerRef=useRef<HTMLButtonElement>(null)
  const listboxId=`select-${useId()}`
  const selectedIndex=Math.max(0,options.findIndex(option=>option.value===String(value)))
  const [open,setOpen]=useState(false)
  const [activeIndex,setActiveIndex]=useState(selectedIndex)
  const typeahead=useRef({value:'',timer:0})
  const selected=options[selectedIndex]

  useEffect(()=>{if(!open)setActiveIndex(selectedIndex)},[open,selectedIndex])
  useEffect(()=>{
    if(!open)return
    const close=(event:PointerEvent)=>{if(!rootRef.current?.contains(event.target as Node))setOpen(false)}
    document.addEventListener('pointerdown',close)
    return()=>document.removeEventListener('pointerdown',close)
  },[open])
  useEffect(()=>()=>window.clearTimeout(typeahead.current.timer),[])

  const move=(direction:1|-1)=>{
    let next=activeIndex
    for(let count=0;count<options.length;count+=1){
      next=(next+direction+options.length)%options.length
      if(!options[next].disabled){setActiveIndex(next);break}
    }
  }
  const choose=(index:number)=>{
    const option=options[index]
    if(!option||option.disabled)return
    onChange(option.value);setOpen(false);setActiveIndex(index)
    requestAnimationFrame(()=>triggerRef.current?.focus())
  }
  const openMenu=()=>{setActiveIndex(selectedIndex);setOpen(true)}
  const onKeyDown=(event:KeyboardEvent<HTMLButtonElement>)=>{
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault()
      if(!open)openMenu()
      else move(event.key==='ArrowDown'?1:-1)
      return
    }
    if(event.key==='Home'||event.key==='End'){
      event.preventDefault();if(!open)setOpen(true)
      const start=event.key==='Home'?0:options.length-1
      const direction=event.key==='Home'?1:-1
      for(let index=start;index>=0&&index<options.length;index+=direction){if(!options[index].disabled){setActiveIndex(index);break}}
      return
    }
    if(event.key==='Enter'||event.key===' '){event.preventDefault();if(open)choose(activeIndex);else openMenu();return}
    if(event.key==='Escape'){event.preventDefault();setOpen(false);return}
    if(event.key==='Tab'){setOpen(false);return}
    if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
      window.clearTimeout(typeahead.current.timer)
      typeahead.current.value+=event.key.toLocaleLowerCase()
      const match=options.findIndex(option=>!option.disabled&&option.label.toLocaleLowerCase().startsWith(typeahead.current.value))
      if(match>=0){setActiveIndex(match);if(!open)setOpen(true)}
      typeahead.current.timer=window.setTimeout(()=>{typeahead.current.value=''},600)
    }
  }

  return <div ref={rootRef} className={`select-control${open?' is-open':''}${icon?' has-icon':''}${className?` ${className}`:''}`}>
    {icon&&<span className="select-icon" aria-hidden="true">{icon}</span>}
    <button ref={triggerRef} type="button" className="select-trigger" role="combobox" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={listboxId} aria-activedescendant={open?`${listboxId}-option-${activeIndex}`:undefined} onClick={()=>open?setOpen(false):openMenu()} onKeyDown={onKeyDown}>
      <span className="select-value">{selected?.label||String(value)}</span><ChevronDown className="select-caret" size={14} aria-hidden="true"/>
    </button>
    {open&&<div id={listboxId} className="select-menu" role="listbox" aria-label={label}>
      {options.map((option,index)=><button id={`${listboxId}-option-${index}`} type="button" role="option" aria-selected={index===selectedIndex} disabled={option.disabled} data-value={option.value} data-active={index===activeIndex} className={`select-option${index===selectedIndex?' is-selected':''}`} key={option.value} onPointerMove={()=>setActiveIndex(index)} onMouseDown={event=>event.preventDefault()} onClick={()=>choose(index)}><span>{option.label}</span>{index===selectedIndex&&<Check size={15} aria-hidden="true"/>}</button>)}
    </div>}
  </div>
}
