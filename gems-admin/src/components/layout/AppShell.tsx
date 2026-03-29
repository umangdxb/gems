import { type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  LayoutDashboard,
  Users,
  ArrowLeftRight,
  ClipboardList,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { Separator } from '@/components/ui/separator'

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, adminOnly: false },
  { label: 'Users', to: '/users', icon: Users, adminOnly: true },
  { label: 'Integration', to: '/integration', icon: ArrowLeftRight, adminOnly: false },
  { label: 'Orders', to: '/orders', icon: ClipboardList, adminOnly: false },
  { label: 'Settings', to: '/settings', icon: Settings, adminOnly: false },
]

function initials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function AppSidebar() {
  const location = useLocation()
  const { logout, user } = useAuth()
  const { theme, resetTheme } = useTheme()

  function handleLogout() {
    resetTheme()
    logout()
  }

  return (
    <Sidebar>
      {/* ── Brand header ── */}
      <SidebarHeader className="px-4 py-4">
        {theme.logoUrl ? (
          <img
            src={theme.logoUrl}
            alt={theme.tenantName}
            className="h-9 max-w-[160px] object-contain object-left"
          />
        ) : (
          <span className="text-xl font-semibold tracking-tight truncate">
            {theme.tenantName}
          </span>
        )}
      </SidebarHeader>

      <Separator />

      {/* ── Nav items ── */}
      <SidebarContent className="pt-2">
        <SidebarMenu>
          {navItems.filter(item => !item.adminOnly || user?.role === 'admin').map(({ label, to, icon: Icon }) => (
            <SidebarMenuItem key={to}>
              <SidebarMenuButton
                isActive={location.pathname.startsWith(to)}
                render={<Link to={to} />}
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className="pb-4">
        <Separator className="mb-3" />

        {/* Current user */}
        {user && (
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="size-7 shrink-0">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        )}

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut className="size-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <p className="mt-2 px-3 text-[11px] text-muted-foreground/60">
          Powered by GEMS
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { theme } = useTheme()

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex flex-1 flex-col min-h-screen">
        <header className="flex h-14 items-center justify-between border-b px-4 gap-3">
          <SidebarTrigger />
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden sm:inline font-medium text-foreground">
              {theme.tenantName !== 'GEMS' ? theme.tenantName : ''}
            </span>
            {user && (
              <Avatar className="size-7">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </header>
        <div className="flex-1 p-6">{children}</div>
      </main>
    </SidebarProvider>
  )
}
