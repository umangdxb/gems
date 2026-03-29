import { LayoutDashboard, ArrowLeftRight, Users, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  orgName: string
  primaryColor: string
  logoPreviewUrl?: string | null
}

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true },
  { label: 'Users', icon: Users, active: false },
  { label: 'Integration', icon: ArrowLeftRight, active: false },
  { label: 'Settings', icon: Settings, active: false },
]

export function BrandPreview({ orgName, primaryColor, logoPreviewUrl }: Props) {
  return (
    <div className="rounded-lg border overflow-hidden shadow-sm text-xs select-none">
      {/* mini topbar */}
      <div className="h-7 flex items-center px-3 gap-2 border-b" style={{ backgroundColor: primaryColor }}>
        <div className="size-2.5 rounded-full bg-white/40" />
        <div className="size-2.5 rounded-full bg-white/40" />
        <div className="size-2.5 rounded-full bg-white/40" />
      </div>

      <div className="flex h-52">
        {/* mini sidebar */}
        <div className="w-28 border-r bg-card flex flex-col py-2 gap-0.5 shrink-0">
          <div className="px-2 pb-2 mb-1 border-b flex items-center gap-1.5 min-h-[28px]">
            {logoPreviewUrl
              ? <img src={logoPreviewUrl} alt="" className="h-4 w-auto max-w-[80px] object-contain object-left" />
              : <span className="text-[11px] font-semibold truncate">{orgName || 'Your Organisation'}</span>
            }
          </div>
          {NAV_ITEMS.map(({ label, icon: Icon, active }) => (
            <div
              key={label}
              className={cn(
                'flex items-center gap-1.5 mx-1 px-2 py-1 rounded text-[10px]',
                active ? 'text-white' : 'text-muted-foreground'
              )}
              style={active ? { backgroundColor: primaryColor } : {}}
            >
              <Icon className="size-2.5 shrink-0" />
              <span>{label}</span>
            </div>
          ))}
          <div className="mt-auto px-2 pt-1 border-t">
            <p className="text-[8px] text-muted-foreground/60">Powered by GEMS</p>
          </div>
        </div>

        {/* mini content */}
        <div className="flex-1 p-3 bg-muted/20">
          <div className="h-3 w-20 rounded bg-muted-foreground/20 mb-3" />
          <div className="grid grid-cols-2 gap-1.5">
            {[1, 2].map(i => (
              <div key={i} className="rounded border bg-card p-2">
                <div className="h-2 w-8 rounded bg-muted-foreground/20 mb-1.5" />
                <div className="h-3 w-5 rounded" style={{ backgroundColor: primaryColor + '44' }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-3 py-1.5 border-t bg-muted/10 text-[10px] text-muted-foreground text-right">
        {orgName || 'Your Organisation'} · Powered by GEMS
      </div>
    </div>
  )
}
