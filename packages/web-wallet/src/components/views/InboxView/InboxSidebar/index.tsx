import React, {FC, ReactElement} from 'react'
import {useTranslate} from '@refinedev/core'
import {Inbox, InboxFolder, InboxEInvoice, getChannelTypeLabel, formatServiceId} from '../types'
import {InboxIcon, getFolderIcon} from '../icons'
import styles from './index.module.css'

/**
 * InboxSidebar Component
 *
 * Displays the inbox folder navigation sidebar with:
 * - List of inboxes
 * - Nested folder navigation
 * - Pending item counts
 * - Service type labels
 *
 * Responsive behavior:
 * - Hidden on mobile (< 768px)
 * - Collapsible on tablet
 * - Full width on desktop
 */

interface Props {
  inboxes: Inbox[]
  invoices: InboxEInvoice[]
  activeInbox: string
  activeFolder: string
  onSelectInbox: (inboxName: string, firstFolderName?: string) => void
  onSelectFolder: (folderName: string) => void
  className?: string
}

const InboxSidebar: FC<Props> = (props: Props): ReactElement => {
  const {inboxes, invoices, activeInbox, activeFolder, onSelectInbox, onSelectFolder, className} = props
  const translate = useTranslate()

  const getPendingCount = (inboxName: string, folderName?: string): number => {
    return invoices.filter(inv => {
      if (inv.inboxName !== inboxName) return false
      if (folderName && inv.folderName !== folderName) return false
      return inv.status === 'pending'
    }).length
  }

  const handleInboxClick = (inbox: Inbox): void => {
    const firstFolder = inbox.folders.length > 0 ? inbox.folders[0].name : undefined
    onSelectInbox(inbox.name, firstFolder)
  }

  const handleFolderClick = (folder: InboxFolder, e: React.MouseEvent): void => {
    e.stopPropagation()
    onSelectFolder(folder.name)
  }

  return (
    <aside className={`${styles.sidebar} ${className || ''}`}>
      <div className={styles.header}>{translate('einvoice_inbox_inboxes', 'Inboxes')}</div>

      <nav className={styles.navigation}>
        {inboxes.map(inbox => {
          const totalPending = getPendingCount(inbox.name)
          const isActive = activeInbox === inbox.name

          return (
            <div key={inbox.id} className={styles.inboxSection}>
              <button
                type="button"
                className={`${styles.inboxItem} ${isActive ? styles.inboxActive : ''}`}
                onClick={() => handleInboxClick(inbox)}
                aria-expanded={isActive}
                aria-controls={`folders-${inbox.id}`}
              >
                <span className={styles.inboxIcon}>
                  <InboxIcon size={18} />
                </span>
                <span className={styles.inboxName}>{inbox.displayName}</span>
                {totalPending > 0 && (
                  <span className={styles.inboxCount} aria-label={`${totalPending} pending`}>
                    {totalPending}
                  </span>
                )}
              </button>

              {isActive && inbox.folders.length > 0 && (
                <div id={`folders-${inbox.id}`} className={styles.folderList} role="group">
                  <div className={styles.folderListHeader}>{translate('einvoice_inbox_folders', 'Folders')}</div>
                  {inbox.folders.map(folder => {
                    const pendingInFolder = getPendingCount(inbox.name, folder.name)
                    const channelLabel = getChannelTypeLabel(folder.serviceType)
                    const isFolderActive = activeFolder === folder.name

                    return (
                      <button
                        key={folder.id}
                        type="button"
                        className={`${styles.folderItem} ${isFolderActive ? styles.folderActive : ''}`}
                        onClick={e => handleFolderClick(folder, e)}
                        title={folder.serviceId}
                        aria-current={isFolderActive ? 'page' : undefined}
                      >
                        <span className={styles.folderIcon}>{getFolderIcon(folder.serviceType)}</span>
                        <span className={styles.folderName}>{formatServiceId(folder.serviceId, 18)}</span>
                        {channelLabel && <span className={styles.channelTag}>{channelLabel}</span>}
                        {pendingInFolder > 0 && (
                          <span className={styles.folderCount} aria-label={`${pendingInFolder} pending`}>
                            {pendingInFolder}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

export default InboxSidebar
export {InboxSidebar}
