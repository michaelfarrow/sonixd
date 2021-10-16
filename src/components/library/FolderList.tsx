import React, { useState } from 'react';
import settings from 'electron-settings';
import { useQuery } from 'react-query';
import { ButtonToolbar, Icon } from 'rsuite';
import { getIndexes, getMusicDirectory } from '../../api/api';
import PageLoader from '../loader/PageLoader';
import ListViewType from '../viewtypes/ListViewType';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  clearSelected,
  setRangeSelected,
  toggleRangeSelected,
  toggleSelected,
} from '../../redux/multiSelectSlice';
import GenericPage from '../layout/GenericPage';
import GenericPageHeader from '../layout/GenericPageHeader';
import { StyledButton, StyledInputPicker } from '../shared/styled';
import { fixPlayer2Index, setPlayQueueByRowClick } from '../../redux/playQueueSlice';
import { setStatus } from '../../redux/playerSlice';
import useSearchQuery from '../../hooks/useSearchQuery';
import { setFolder } from '../../redux/folderSlice';

const FolderList = () => {
  const dispatch = useAppDispatch();
  const folder = useAppSelector((state) => state.folder);
  const { isLoading, isError, data, error }: any = useQuery(['folders'], () => getIndexes(), {
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
  const { data: folderData }: any = useQuery(
    ['folder', folder.id],
    () => getMusicDirectory({ id: folder.id }),
    {
      enabled: folder.id !== '',
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
  const [searchQuery, setSearchQuery] = useState('');
  const filteredData = useSearchQuery(searchQuery, folderData?.child, [
    'title',
    'artist',
    'album',
    'year',
    'genre',
    'path',
  ]);

  let timeout: any = null;
  const handleRowClick = (e: any, rowData: any) => {
    if (timeout === null) {
      timeout = window.setTimeout(() => {
        timeout = null;

        if (e.ctrlKey) {
          dispatch(toggleSelected(rowData));
        } else if (e.shiftKey) {
          dispatch(setRangeSelected(rowData));
          dispatch(toggleRangeSelected(folderData.child));
        }
      }, 100);
    }
  };

  const handleRowDoubleClick = (rowData: any) => {
    window.clearTimeout(timeout);
    timeout = null;

    dispatch(clearSelected());
    if (rowData.isDir) {
      dispatch(setFolder({ id: rowData.id }));
    } else {
      dispatch(
        setPlayQueueByRowClick({
          entries: folderData?.child?.filter((entry: any) => entry.isDir === false),
          currentIndex: rowData.index,
          currentSongId: rowData.id,
          uniqueSongId: rowData.uniqueId,
        })
      );
      dispatch(setStatus('PLAYING'));
      dispatch(fixPlayer2Index());
    }
  };

  return (
    <>
      {isLoading && <PageLoader />}
      {isError && <div>Error: {error}</div>}
      {!isLoading && data && (
        <GenericPage
          hideDivider
          header={
            <GenericPageHeader
              title={`${folderData?.name ? folderData.name : 'Select a folder'}`}
              showSearchBar
              searchQuery={searchQuery}
              handleSearch={(e: any) => setSearchQuery(e)}
              clearSearchQuery={() => setSearchQuery('')}
              showTitleTooltip
              subtitle={
                <>
                  <ButtonToolbar>
                    <StyledInputPicker
                      data={data}
                      size="sm"
                      labelKey="name"
                      valueKey="id"
                      virtualized
                      onChange={(e: string) => {
                        dispatch(setFolder({ id: e }));
                      }}
                    />

                    <StyledButton
                      size="sm"
                      disabled={!folderData?.parent}
                      onClick={() => {
                        if (folderData?.parent) {
                          dispatch(setFolder({ id: folderData?.parent }));
                        }
                      }}
                    >
                      <Icon icon="level-up" style={{ marginRight: '10px' }} />
                      Go up
                    </StyledButton>
                  </ButtonToolbar>
                </>
              }
            />
          }
        >
          <ListViewType
            data={searchQuery !== '' ? filteredData : folderData?.child}
            tableColumns={settings.getSync('musicListColumns')}
            rowHeight={Number(settings.getSync('musicListRowHeight'))}
            fontSize={Number(settings.getSync('musicListFontSize'))}
            handleRowClick={handleRowClick}
            handleRowDoubleClick={handleRowDoubleClick}
            cacheImages={{
              enabled: settings.getSync('cacheImages'),
              cacheType: 'folder',
              cacheIdProperty: 'albumId',
            }}
            listType="folder"
            virtualized
            disabledContextMenuOptions={[
              'addToFavorites',
              'removeFromFavorites',
              'viewInModal',
              'moveSelectedTo',
              'removeFromCurrent',
              'deletePlaylist',
            ]}
          />
        </GenericPage>
      )}
    </>
  );
};

export default FolderList;