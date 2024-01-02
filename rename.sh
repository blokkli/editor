#!/bin/bash

# Declare an indexed array for find-replace pairs
declare -a replace_pairs

# Add your pairs here: "find_text=>replace_text"
replace_pairs+=("AddNewBlokkliItemEvent=>AddNewBlockEvent")
replace_pairs+=("UpdateBlokkliItemOptionEvent=>UpdateBlockOptionEvent")
replace_pairs+=("addBlokkliItemFromClipboard=>addBlockFromClipboardItem")
replace_pairs+=("MoveBlokkliEvent=>MoveBlockEvent")
replace_pairs+=("MoveMultipleBlokkliItemsEvent=>MoveMultipleBlocksEvent")
replace_pairs+=("EditBlokkliItemEvent=>EditBlockEvent")
replace_pairs+=("BlokkliEditMode=>EditMode")
replace_pairs+=("BlokkliTranslationState=>TranslationState")
replace_pairs+=("BlokkliMutatedField=>MutatedField")
replace_pairs+=("BlokkliValidation=>Validation")
replace_pairs+=("BlokkliMutationItem=>MutationItem")
replace_pairs+=("BlokkliLibraryItem=>LibraryItem")
replace_pairs+=("BlokkliFieldListItem=>FieldListItem")
replace_pairs+=("BlokkliImportItem=>ImportItem")
replace_pairs+=("BlokkliComment=>CommentItem")
replace_pairs+=("BlokkliMappedState=>MappedState")
replace_pairs+=("BlokkliEditEntity=>EditEntity")
replace_pairs+=("BlokkliItemType=>BlockBundleDefinition")
replace_pairs+=("BlokkliSearchContentItem=>SearchContentItem")
replace_pairs+=("DraggableExistingBlokkliItem=>DraggableExistingBlock")
replace_pairs+=("BlokkliMessage=>Message")
replace_pairs+=("TranslateBlokkliItemEvent=>TranslateBlockEvent")
replace_pairs+=("ConvertBlokkliItemEvent=>ConvertBlockEvent")
replace_pairs+=("BlokkliEditableType=>EditableType")
replace_pairs+=("BlokkliEvents=>EventbusEvents")
replace_pairs+=("BlokkliDomProvider=>DomProvider")
replace_pairs+=("BlokkliAdapterContext=>AdapterContext")
replace_pairs+=("BlokkliStorageProvider=>StorageProvider")
replace_pairs+=("BlokkliTypesProvider=>BlockDefinitionProvider")
replace_pairs+=("BlokkliKeyboardProvider=>KeyboardProvider")
replace_pairs+=("BlokkliUiProvider=>UiProvider")
replace_pairs+=("BlokkliAnimationProvider=>AnimationProvider")
replace_pairs+=("BlokkliStateProvider=>StateProvider")
replace_pairs+=("BlokkliDefinitionOption=>BlockOptionDefinition")
replace_pairs+=("BlokkliTextProvider=>TextProvider")
replace_pairs+=("BlokkliFeatureDefinition=>FeatureDefinition")
replace_pairs+=("BlokkliFeature=>Feature")
replace_pairs+=("BlokkliItemDefinitionOptionsInput=>BlockDefinitionOptionsInput")
replace_pairs+=("BlokkliItemDefinitionInput=>BlockDefinitionInput")
replace_pairs+=("BlokkliFieldConfig=>FieldConfig")
replace_pairs+=("BlokkliEntityContext=>EntityContext")
replace_pairs+=("BlokkliLanguage=>Language")
replace_pairs+=("BlokkliEntityTranslation=>EntityTranslation")
replace_pairs+=("BlokkliConversionItem=>ConversionItem")
replace_pairs+=("BlokkliTransformPlugin=>TransformPlugin")
replace_pairs+=("defineFeature=>defineBlokkliFeature")
replace_pairs+=("BlokkliSelectionProvider=>SelectionProvider")
replace_pairs+=("BlokkliEventBus=>Eventbus")
replace_pairs+=("BlokkliItemEditContext=>ItemEditContext")
# replace_pairs+=("=>")

# Directory to search
search_dirs=("./src" "./playground")

# Delimiter
delimiter="=>"

# Loop through each directory
for dir in "${search_dirs[@]}"; do
    # Loop through the array and perform replacements
    for pair in "${replace_pairs[@]}"; do
        # Splitting the pair into find_text and replace_text using delimiter
        find_text=${pair%%"$delimiter"*}
        replace_text=${pair#*"$delimiter"}

        echo "Replacing '$find_text' with '$replace_text' in $dir..."

        # Execute find and sed commands
        find "$dir" -type f \( -name "*.ts" -o -name "*.vue" \) -exec sed -i "s/$find_text/$replace_text/g" {} +
    done
done

echo "Replacement complete."
