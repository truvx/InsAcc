import struct
import sys

def create_minimal_pe(output_path):
    dos_stub = b"This program cannot be run in DOS mode.\r\n\r\n$"

    # DOS Header (64 bytes)
    dos_header = b'MZ'                      # e_magic
    dos_header += struct.pack('<H', 0x50)   # e_cblp
    dos_header += struct.pack('<H', 0x02)   # e_cp
    dos_header += struct.pack('<H', 0x00)   # e_crlc
    dos_header += struct.pack('<H', 0x04)   # e_cparhdr
    dos_header += struct.pack('<H', 0x00)   # e_minalloc
    dos_header += struct.pack('<H', 0x00)   # e_maxalloc
    dos_header += struct.pack('<H', 0x00)   # e_ss
    dos_header += struct.pack('<H', 0x00)   # e_sp
    dos_header += struct.pack('<H', 0x00)   # e_csum
    dos_header += struct.pack('<H', 0x00)   # e_ip
    dos_header += struct.pack('<H', 0x00)   # e_cs
    dos_header += struct.pack('<H', 0x40)   # e_lfarlc
    dos_header += struct.pack('<H', 0x00)   # e_ovno
    dos_header += struct.pack('<H', 0x00) * 4  # e_res
    dos_header += struct.pack('<H', 0x00)   # e_oemid
    dos_header += struct.pack('<H', 0x00)   # e_oeminfo
    dos_header += struct.pack('<H', 0x00) * 10 # e_res2
    e_lfanew = 64 + len(dos_stub)  # offset to PE signature
    dos_header += struct.pack('<I', e_lfanew)

    # Align dos_stub to 4 bytes
    while len(dos_stub) % 4 != 0:
        dos_stub += b'\x00'

    # PE signature
    pe_sig = b'PE\x00\x00'

    # COFF File Header (20 bytes)
    coff = struct.pack('<H', 0x8664)   # Machine: AMD64
    coff += struct.pack('<H', 1)       # NumberOfSections
    coff += struct.pack('<I', 0)       # TimeDateStamp
    coff += struct.pack('<I', 0)       # PointerToSymbolTable
    coff += struct.pack('<I', 0)       # NumberOfSymbols
    coff += struct.pack('<H', 0x0E)    # SizeOfOptionalHeader (PE32+ = 0x00F0)
    coff += struct.pack('<H', 0x002F)  # Characteristics: EXE + large address aware

    # PE32+ Optional Header (112 bytes = 0x70)
    opt = struct.pack('<H', 0x020B)    # Magic: PE32+
    opt += struct.pack('B', 0x00)      # MajorLinkerVersion
    opt += struct.pack('B', 0x00)      # MinorLinkerVersion
    opt += struct.pack('<I', 0)        # SizeOfCode
    opt += struct.pack('<I', 0)        # SizeOfInitializedData
    opt += struct.pack('<I', 0)        # SizeOfUninitializedData
    opt += struct.pack('<I', 0x1000)   # AddressOfEntryPoint (RVA 0x1000)
    opt += struct.pack('<I', 0x1000)   # BaseOfCode

    # Windows-specific (PE32+)
    opt += struct.pack('<Q', 0x140000000)  # ImageBase
    opt += struct.pack('<I', 0x1000)       # SectionAlignment
    opt += struct.pack('<I', 0x200)        # FileAlignment
    opt += struct.pack('<H', 0x00)         # MajorOperatingSystemVersion
    opt += struct.pack('<H', 0x00)         # MinorOperatingSystemVersion
    opt += struct.pack('<H', 0x00)         # MajorImageVersion
    opt += struct.pack('<H', 0x00)         # MinorImageVersion
    opt += struct.pack('<H', 0x00)         # MajorSubsystemVersion
    opt += struct.pack('<H', 0x00)         # MinorSubsystemVersion
    opt += struct.pack('<I', 0)            # Win32VersionValue
    opt += struct.pack('<I', 0x2000)       # SizeOfImage
    opt += struct.pack('<I', 0x200)        # SizeOfHeaders
    opt += struct.pack('<I', 0)            # CheckSum
    opt += struct.pack('<H', 0x02)         # Subsystem: WINDOWS_GUI
    opt += struct.pack('<H', 0x0000)       # DllCharacteristics
    opt += struct.pack('<Q', 0x100000)     # SizeOfStackReserve
    opt += struct.pack('<Q', 0x1000)       # SizeOfStackCommit
    opt += struct.pack('<Q', 0x100000)     # SizeOfHeapReserve
    opt += struct.pack('<Q', 0x1000)       # SizeOfHeapCommit
    opt += struct.pack('<I', 0)            # LoaderFlags
    opt += struct.pack('<I', 0)            # NumberOfRvaAndSizes (0 = no data directories)

    # One section: .text (no data dirs)
    sec_name = b'.text\x00\x00\x00'
    sec = struct.pack('<I', 0x60000020)   # Characteristics: CODE | EXECUTE | READ
    sec += struct.pack('<I', 0x200)       # VirtualSize
    sec += struct.pack('<I', 0x1000)      # VirtualAddress
    sec += struct.pack('<I', 0x200)       # SizeOfRawData
    sec += struct.pack('<I', 0x200)       # PointerToRawData
    sec += struct.pack('<I', 0)           # PointerToRelocations
    sec += struct.pack('<I', 0)           # PointerToLinenumbers
    sec += struct.pack('<H', 0)           # NumberOfRelocations
    sec += struct.pack('<H', 0)           # NumberOfLinenumbers

    size_of_headers = 64 + len(dos_stub) + 4 + 20 + len(opt) + 40
    pad_to_512 = (size_of_headers + 0x1FF) & ~0x1FF  # align to file alignment (512)
    headers_padding = b'\x00' * (pad_to_512 - size_of_headers)

    # Section data: just a RET instruction (0xC3)
    section_data = b'\xC3'
    section_data += b'\x00' * (0x200 - len(section_data))  # pad to raw size

    with open(output_path, 'wb') as f:
        f.write(dos_header)
        f.write(dos_stub)
        f.write(pe_sig)
        f.write(coff)
        f.write(opt)
        # Write section name manually
        f.write(b'.text\x00\x00\x00')
        # Write the rest of section header
        section_header = struct.pack('<I', 0x200)   # VirtualSize
        section_header += struct.pack('<I', 0x1000) # VirtualAddress
        section_header += struct.pack('<I', 0x200)  # SizeOfRawData
        section_header += struct.pack('<I', pad_to_512)  # PointerToRawData
        section_header += struct.pack('<I', 0)      # PointerToRelocations
        section_header += struct.pack('<I', 0)      # PointerToLinenumbers
        section_header += struct.pack('<H', 0)      # NumberOfRelocations
        section_header += struct.pack('<H', 0)      # NumberOfLinenumbers
        section_header += struct.pack('<I', 0x60000020) # Characteristics
        f.write(section_header)
        f.write(headers_padding)
        f.write(section_data)

    print(f"Created: {output_path} ({pad_to_512 + 0x200} bytes)")

if __name__ == '__main__':
    create_minimal_pe(sys.argv[1] if len(sys.argv) > 1 else 'minimal.exe')
