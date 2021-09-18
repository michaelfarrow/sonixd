/* eslint-disable no-await-in-loop */
import React, { useRef, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useHistory } from 'react-router';
import { Popover, Whisper } from 'rsuite';
import { getPlaylists, populatePlaylist, star, unstar } from '../../api/api';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  addProcessingPlaylist,
  removeProcessingPlaylist,
  setContextMenu,
} from '../../redux/miscSlice';
import { setStar } from '../../redux/playQueueSlice';
import {
  ContextMenuDivider,
  ContextMenuWindow,
  StyledContextMenuButton,
  StyledInputPicker,
  StyledButton,
} from './styled';
import { notifyToast } from './toast';
import { sleep } from '../../shared/utils';

export const ContextMenuButton = ({ children, ...rest }: any) => {
  return (
    <StyledContextMenuButton {...rest} appearance="subtle" size="sm" block>
      {children}
    </StyledContextMenuButton>
  );
};

export const ContextMenu = ({
  yPos,
  xPos,
  width,
  numOfButtons,
  numOfDividers,
  hasTitle,
  children,
}: any) => {
  return (
    <ContextMenuWindow
      yPos={yPos}
      xPos={xPos}
      width={width}
      numOfButtons={numOfButtons}
      numOfDividers={numOfDividers}
      hasTitle={hasTitle}
    >
      {children}
    </ContextMenuWindow>
  );
};

export const GlobalContextMenu = () => {
  const history = useHistory();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const misc = useAppSelector((state) => state.misc);
  const multiSelect = useAppSelector((state) => state.multiSelect);
  const playlistTriggerRef = useRef<any>();
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');

  const { data: playlists }: any = useQuery(['playlists', 'name'], () =>
    getPlaylists('name')
  );

  const handleAddToPlaylist = async () => {
    // If the window is closed, the selectedPlaylistId will be deleted
    const localSelectedPlaylistId = selectedPlaylistId;
    dispatch(addProcessingPlaylist(selectedPlaylistId));

    const sortedEntries = [...multiSelect.selected].sort(
      (a: any, b: any) => a.rowIndex - b.rowIndex
    );

    try {
      const res = await populatePlaylist(
        localSelectedPlaylistId,
        sortedEntries
      );

      if (res.status === 'failed') {
        notifyToast('error', res.error.message);
      } else {
        notifyToast(
          'success',
          <>
            <p>
              Added {sortedEntries.length} song(s) to playlist &quot;
              {
                playlists.find(
                  (playlist: any) => playlist.id === localSelectedPlaylistId
                )?.name
              }
              &quot;
            </p>
            <StyledButton
              appearance="link"
              onClick={() => {
                history.push(`/playlist/${localSelectedPlaylistId}`);
                dispatch(setContextMenu({ show: false }));
              }}
            >
              Go to playlist
            </StyledButton>
          </>
        );
      }
    } catch (err) {
      console.log(err);
    }

    dispatch(removeProcessingPlaylist(localSelectedPlaylistId));
  };

  const refetchAfterFavorite = async () => {
    await queryClient.refetchQueries(['starred'], {
      active: true,
    });
    await queryClient.refetchQueries(['album'], {
      active: true,
    });
    await queryClient.refetchQueries(['albumList'], {
      active: true,
    });
    await queryClient.refetchQueries(['playlist'], {
      active: true,
    });
  };

  const handleFavorite = async (ordered: boolean) => {
    dispatch(setContextMenu({ show: false }));

    const sortedEntries = [...multiSelect.selected].sort(
      (a: any, b: any) => a.rowIndex - b.rowIndex
    );

    for (let i = 0; i < sortedEntries.length; i += 1) {
      await star(sortedEntries[i].id, sortedEntries[i].type);
      dispatch(setStar({ id: sortedEntries[i].id, type: 'star' }));
      if (ordered) {
        await sleep(350);
      }
    }

    await refetchAfterFavorite();
  };

  const handleUnfavorite = async () => {
    dispatch(setContextMenu({ show: false }));

    const starredEntries = multiSelect.selected.filter(
      (entry: any) => entry.starred
    );

    for (let i = 0; i < starredEntries.length; i += 1) {
      await unstar(starredEntries[i].id, starredEntries[i].type);
      dispatch(setStar({ id: starredEntries[i].id, type: 'unstar' }));
    }

    await refetchAfterFavorite();
  };

  return (
    <>
      {misc.contextMenu.show && misc.contextMenu.type === 'nowPlaying' && (
        <>
          <ContextMenu
            xPos={misc.contextMenu.xPos}
            yPos={misc.contextMenu.yPos}
            width={190}
            numOfButtons={7}
            numOfDividers={3}
          >
            <ContextMenuButton>
              Selected: {multiSelect.selected.length}
            </ContextMenuButton>
            <ContextMenuDivider />
            <ContextMenuButton>Add to queue</ContextMenuButton>
            <ContextMenuButton>Remove from current</ContextMenuButton>
            <ContextMenuDivider />

            <Whisper
              ref={playlistTriggerRef}
              enterable
              placement="autoHorizontalStart"
              trigger="none"
              speaker={
                <Popover>
                  <StyledInputPicker
                    data={playlists}
                    placement="autoVerticalStart"
                    virtualized
                    labelKey="name"
                    valueKey="id"
                    width={200}
                    onChange={(e: any) => setSelectedPlaylistId(e)}
                  />
                  <StyledButton
                    disabled={
                      !selectedPlaylistId ||
                      misc.isProcessingPlaylist.includes(selectedPlaylistId)
                    }
                    loading={misc.isProcessingPlaylist.includes(
                      selectedPlaylistId
                    )}
                    onClick={handleAddToPlaylist}
                  >
                    Add
                  </StyledButton>
                </Popover>
              }
            >
              <ContextMenuButton
                onClick={() =>
                  playlistTriggerRef.current.state.isOverlayShown
                    ? playlistTriggerRef.current.close()
                    : playlistTriggerRef.current.open()
                }
              >
                Add to playlist
              </ContextMenuButton>
            </Whisper>

            <ContextMenuDivider />
            <ContextMenuButton onClick={() => handleFavorite(false)}>
              Add to favorites
            </ContextMenuButton>
            <ContextMenuButton onClick={() => handleFavorite(true)}>
              Add to favorites (ordered)
            </ContextMenuButton>
            <ContextMenuButton onClick={handleUnfavorite}>
              Remove from favorites
            </ContextMenuButton>
          </ContextMenu>
        </>
      )}
    </>
  );
};