import { useState } from "react";
import ModalPopup from "./ModalPopup";

function Unused() {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isActionBarVisible, setIsActionBarVisible] = useState<boolean>(false);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const toggleActionBar = () => {
    setIsActionBarVisible(!isActionBarVisible);
  };

  // <ActionBar isVisible={isActionBarVisible} actions={barActions} />

  return (
    <>
      <button onClick={toggleActionBar}>Toggle Action Bar</button>

      <button onClick={openModal}>Open Modal</button>
      { isModalOpen && <ModalPopup message="Hello, I'm a modal!" onClose={closeModal} /> }
    </>
  );
}
