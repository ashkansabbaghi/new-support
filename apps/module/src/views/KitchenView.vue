<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAppearance } from '@/composables/useAppearance'

const { t } = useI18n()
const appearance = useAppearance()

const title = ref('')
const note = ref('')
const department = ref('billing')
const tab = ref('tokens')

const tokens = computed(() => [
  ['--support-color-primary', 'var(--support-color-primary)'],
  ['--support-color-primary-soft', 'var(--support-color-primary-soft)'],
  ['--support-color-header', 'var(--support-color-header)'],
  ['--support-color-background', 'var(--support-color-background)'],
  ['--support-color-surface', 'var(--support-color-surface)'],
  ['--support-color-foreground', 'var(--support-color-foreground)'],
  ['--support-color-muted', 'var(--support-color-muted)'],
  ['--support-color-border', 'var(--support-color-border)'],
  ['--support-color-online', 'var(--support-color-online)'],
  ['--support-color-success', 'var(--support-color-success)'],
  ['--support-color-danger', 'var(--support-color-danger)'],
  ['--support-color-incoming', 'var(--support-color-incoming)'],
  ['--support-color-sent-start', 'var(--support-color-sent-start)'],
  ['--support-color-sent-end', 'var(--support-color-sent-end)'],
] as const)
</script>

<template>
  <div class="support-safe-pad support-vv-min-height bg-background text-foreground">
    <header
      class="flex h-[var(--support-size-header)] items-center justify-between gap-3 bg-support-header px-4 text-support-header-foreground"
    >
      <div class="flex min-w-0 items-center gap-3">
        <Avatar class="size-10 border-[3px] border-white/30 bg-support-primary-soft">
          <AvatarFallback class="bg-support-primary-soft text-sm text-white">
            ن
          </AvatarFallback>
        </Avatar>
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold">
            {{ t('kitchen.title') }}
          </p>
          <p class="truncate text-xs text-white/80">
            {{ t('kitchen.subtitle') }}
          </p>
        </div>
      </div>
      <div class="flex shrink-0 flex-wrap justify-end gap-2">
        <Button
          size="sm"
          variant="secondary"
          class="bg-white/15 text-white hover:bg-white/25"
          @click="appearance.toggleLocale()"
        >
          {{ appearance.locale === 'fa-IR' ? t('kitchen.localeEn') : t('kitchen.localeFa') }}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          class="bg-white/15 text-white hover:bg-white/25"
          @click="appearance.toggleTheme()"
        >
          {{ appearance.theme === 'dark' ? t('kitchen.themeLight') : t('kitchen.themeDark') }}
        </Button>
      </div>
    </header>

    <main class="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <p class="text-sm text-muted-foreground">
        {{ t('kitchen.tokenNote') }}
        <RouterLink
          class="text-primary underline-offset-4 hover:underline"
          to="/"
        >
          {{ t('placeholder.title') }}
        </RouterLink>
      </p>
      <p class="flex flex-wrap gap-3 text-sm">
        <RouterLink
          class="text-primary underline-offset-4 hover:underline"
          to="/ticket/list"
        >
          {{ t('staff.tickets') }}
        </RouterLink>
        <RouterLink
          class="text-primary underline-offset-4 hover:underline"
          to="/departments"
        >
          {{ t('staff.admin.departments') }}
        </RouterLink>
        <RouterLink
          class="text-primary underline-offset-4 hover:underline"
          to="/faqs"
        >
          {{ t('staff.admin.faqs') }}
        </RouterLink>
        <RouterLink
          class="text-primary underline-offset-4 hover:underline"
          to="/predetermined-answer"
        >
          {{ t('staff.admin.predetermined') }}
        </RouterLink>
        <RouterLink
          class="text-primary underline-offset-4 hover:underline"
          to="/staffs-list"
        >
          {{ t('staff.admin.staffs') }}
        </RouterLink>
      </p>

      <Tabs v-model="tab">
        <TabsList>
          <TabsTrigger value="tokens">
            {{ t('kitchen.tokens') }}
          </TabsTrigger>
          <TabsTrigger value="components">
            {{ t('kitchen.components') }}
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="tokens"
          class="mt-4 space-y-4"
        >
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="[name, value] in tokens"
              :key="name"
              class="flex items-center gap-3 rounded-support border border-border bg-card p-3"
            >
              <span
                class="size-10 shrink-0 rounded-support-chip border border-border"
                :style="{ background: value }"
              />
              <code class="text-xs break-all">{{ name }}</code>
            </div>
          </div>
          <div class="flex flex-wrap gap-3">
            <div
              class="max-w-xs rounded-support bg-support-incoming px-3 py-2 text-sm text-support-incoming-foreground"
            >
              {{ t('kitchen.incomingPreview') }}
            </div>
            <div
              class="max-w-xs rounded-support px-3 py-2 text-sm text-white"
              :style="{ backgroundImage: 'var(--support-gradient-sent)' }"
            >
              {{ t('kitchen.sentPreview') }}
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="components"
          class="mt-4 space-y-6"
        >
          <section class="space-y-3">
            <div class="flex flex-wrap gap-2">
              <Button class="shadow-support-primary">
                {{ t('chat.start.start-chat') }}
              </Button>
              <Button variant="secondary">
                {{ t('chat.settings.save') }}
              </Button>
              <Button variant="outline">
                {{ t('chat.faq.close') }}
              </Button>
              <Button variant="ghost">
                {{ t('chat.global.menu.settings') }}
              </Button>
              <Button variant="destructive">
                {{ t('chat.global.menu.end') }}
              </Button>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <Badge>{{ t('kitchen.badgeDefault') }}</Badge>
              <Badge variant="secondary">
                {{ t('chat.global.offline') }}
              </Badge>
              <Badge
                variant="outline"
                class="gap-1"
              >
                <span class="size-1.5 rounded-full bg-support-online" />
                {{ t('kitchen.badgeOnline') }}
              </Badge>
            </div>
          </section>

          <Separator />

          <section class="grid gap-4 md:grid-cols-2">
            <Input
              v-model="title"
              :placeholder="t('chat.start.sample')"
              :aria-label="t('kitchen.sampleInput')"
            />
            <Select v-model="department">
              <SelectTrigger
                class="w-full"
                :aria-label="t('chat.start.department')"
              >
                <SelectValue :placeholder="t('chat.start.select-department')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="billing">
                  {{ t('chat.start.department') }}
                </SelectItem>
                <SelectItem value="technical">
                  {{ t('chat.global.operator') }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              v-model="note"
              class="md:col-span-2"
              :placeholder="t('chat.conversation.write-message')"
              :aria-label="t('kitchen.sampleTextarea')"
            />
          </section>

          <section class="flex flex-wrap items-center gap-3">
            <Dialog>
              <DialogTrigger as-child>
                <Button variant="outline">
                  {{ t('kitchen.openDialog') }}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{{ t('kitchen.dialogTitle') }}</DialogTitle>
                  <DialogDescription>
                    {{ t('kitchen.dialogBody') }}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose as-child>
                    <Button variant="outline">
                      {{ t('chat.global.close') }}
                    </Button>
                  </DialogClose>
                  <Button>{{ t('chat.settings.save') }}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="outline">
                  {{ t('kitchen.menu') }}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>{{ t('chat.global.menu.title') }}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>{{ t('chat.global.menu.settings') }}</DropdownMenuItem>
                <DropdownMenuItem>{{ t('chat.global.menu.history') }}</DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                  {{ t('chat.global.menu.end') }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </section>

          <ScrollArea class="h-36 rounded-support border border-border">
            <ul class="space-y-2 p-3 text-sm">
              <li
                v-for="index in 8"
                :key="index"
              >
                {{ t('kitchen.scrollHint') }} {{ index }}
              </li>
            </ul>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </main>
  </div>
</template>
