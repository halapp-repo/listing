export interface IMapper<TModal, TDto> {
    toDTO(arg: TModal): TDto;
    toModal(arg: TDto): TModal;
}