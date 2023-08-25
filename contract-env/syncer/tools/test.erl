-module(test).
-export([start/0, testunsigned/0, testint/0, testbin/0, testlist/0, test_bin_real/0, test_range/0, test_io_list/0, test_raw/0, test_bigger/0]).

encode_int(undefined, SizeBits) ->
	<< 0:SizeBits >>;
encode_int(N, SizeBits) ->
	Bin = binary:encode_unsigned(N, big),
	<< (byte_size(Bin)):SizeBits, Bin/binary >>.

encode_bin(undefined, SizeBits) ->
	<< 0:SizeBits >>;
encode_bin(Bin, SizeBits) ->
	<< (byte_size(Bin)):SizeBits, Bin/binary >>.

encode_bin_list(Bins, LenBits, ElemSizeBits) ->
	encode_bin_list(Bins, [], 0, LenBits, ElemSizeBits).

encode_bin_list([], Encoded, N, LenBits, _ElemSizeBits) ->
	<< N:LenBits, (iolist_to_binary(Encoded))/binary >>;
encode_bin_list([Bin | Bins], Encoded, N, LenBits, ElemSizeBits) ->
	Elem = encode_bin(Bin, ElemSizeBits),
	encode_bin_list(Bins, [Elem | Encoded], N + 1, LenBits, ElemSizeBits).

start() ->
	io:format(base64:encode(encode_int(1234, 16))).

testunsigned() ->
	io:format("<<~s>>~n", [[io_lib:format("~2.16.0B",[X]) || <<X:8>> <= binary:encode_unsigned(0) ]]).

testint() ->
	io:format("<<~s>>~n", [[io_lib:format("~2.16.0B",[X]) || <<X:8>> <= encode_int(115792071036953558077439067295872093892934358766013398190786716226139132215951, 16) ]]).

testbin() ->
	io:format("<<~s>>~n", [[io_lib:format("~2.16.0B",[X]) || <<X:8>> <= encode_bin(<<9,7>>, 16) ]]).

testlist() ->
	io:format("<<~s>>~n", [[io_lib:format("~2.16.0B",[X]) || <<X:8>> <= encode_bin_list([], 16, 16) ]]).


test_bin_real() ->
	io:format("<<~s>>~n", [[io_lib:format("~2.16.0B",[X]) || <<X:8>> <= encode_bin(<<101,121,45,44,133,46,96,70,147,172,222,165,218,10,216,59,143,73,122,6,142,167,75,27,207,248,173,159,168,85,40,182,168,227,178,255,145,209,100,50,82,119,85,100,136,241,242,193>>, 8) ]]).

test_range() ->
	io:format("<<~s>>~n", [[io_lib:format("~2.16.0B",[X]) || <<X:8>> <= <<1:16, 3:16>> ]]).

test_io_list() ->
	io:format("<<~s>>~n", [[io_lib:format("~2.16.0B",[X]) || <<X:8>> <= iolist_to_binary([<<1,2,3>>, 4, <<5,6,7>>]) ]]).

test_raw() ->
	io:format("<<~s>>~n", [[io_lib:format("~2.16.0B",[X]) || <<X:8>> <= <<0:256>> ]]).

test_bigger() ->
	In = <<236,212,109,30,152,54,36,67,231,223,181,220,69,67,90,218,36,106,4,2,4,228,99,72,192,22,232,191,243,151,255,216, 23>>,
	io:format("<<~s>>~n", [[io_lib:format("~2.16.0B",[X]) || <<X:8>> <= <<In:32/binary>> ]]).